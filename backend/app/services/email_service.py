import os
import smtplib
import socket
import ssl
import logging
import datetime
import uuid
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional

import sqlalchemy
from backend.app.core.db_resilience import get_resilient_db_engine

logger = logging.getLogger("nirman.email_service")


class EmailService:
    """
    Production-oriented Email Service providing SMTP abstraction, safe environment configuration,
    structured connection diagnostics, and audit state tracking (PENDING -> SENT / FAILED).
    """

    def __init__(self):
        self.provider = os.getenv("EMAIL_PROVIDER", "SMTP").upper()
        self.smtp_host = os.getenv("SMTP_HOST", "")
        try:
            self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        except ValueError:
            self.smtp_port = 587

        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
        self.smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
        
        # Preserves backward compatibility with EMAIL_FROM and EMAIL_FROM_NAME
        self.email_from = os.getenv("SMTP_FROM_EMAIL", os.getenv("EMAIL_FROM", "notifications@nirman.gov.in"))
        self.email_from_name = os.getenv("SMTP_FROM_NAME", os.getenv("EMAIL_FROM_NAME", "Nirman AI Risk System"))

    def is_configured(self) -> bool:
        """Returns True if minimum required SMTP credentials/host settings are provided."""
        return bool(self.smtp_host and self.smtp_username and self.smtp_password)

    def get_status_info(self) -> Dict[str, Any]:
        """Returns sanitized provider configuration state without exposing secrets."""
        configured = self.is_configured()
        return {
            "provider": self.provider,
            "configured": configured,
            "status": "READY" if configured else "NOT CONFIGURED",
            "smtp_host": self.smtp_host or "NOT_CONFIGURED",
            "smtp_port": self.smtp_port,
            "smtp_username": self.smtp_username or "NOT_CONFIGURED",
            "smtp_use_tls": self.smtp_use_tls,
            "smtp_use_ssl": self.smtp_use_ssl,
            "email_from": self.email_from
        }

    def diagnose_smtp_connection(self) -> Dict[str, Any]:
        """
        Performs safe diagnostic check distinguishing configuration, connection, authentication,
        and TLS negotiation failures. Never exposes password/credentials.
        """
        if not self.is_configured():
            missing = []
            if not self.smtp_host: missing.append("SMTP_HOST")
            if not self.smtp_username: missing.append("SMTP_USERNAME")
            if not self.smtp_password: missing.append("SMTP_PASSWORD")
            
            return {
                "configured": False,
                "status": "SMTP_NOT_CONFIGURED",
                "provider": self.provider,
                "smtp_host": self.smtp_host or "NOT_CONFIGURED",
                "smtp_port": self.smtp_port,
                "smtp_use_tls": self.smtp_use_tls,
                "email_from": self.email_from,
                "message": f"SMTP is not configured. Add {', '.join(missing)} in the backend environment configuration."
            }

        server = None
        try:
            if self.smtp_use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=5)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=5)

            if self.smtp_use_tls and not self.smtp_use_ssl:
                server.starttls()

            server.login(self.smtp_username, self.smtp_password)
            server.quit()

            return {
                "configured": True,
                "status": "SMTP_CONFIGURED_AND_REACHABLE",
                "provider": self.provider,
                "smtp_host": self.smtp_host,
                "smtp_port": self.smtp_port,
                "smtp_use_tls": self.smtp_use_tls,
                "email_from": self.email_from,
                "message": "SMTP provider verified successfully."
            }

        except smtplib.SMTPAuthenticationError as exc:
            err_sanitized = self._sanitize_error(str(exc))
            logger.warning(f"SMTP Auth Failure: {err_sanitized}")
            return {
                "configured": True,
                "status": "SMTP_AUTH_FAILED",
                "provider": self.provider,
                "smtp_host": self.smtp_host,
                "smtp_port": self.smtp_port,
                "smtp_use_tls": self.smtp_use_tls,
                "email_from": self.email_from,
                "message": "SMTP authentication failed."
            }
        except (ssl.SSLError, smtplib.SMTPException) as exc:
            err_sanitized = self._sanitize_error(str(exc))
            logger.warning(f"SMTP TLS Failure: {err_sanitized}")
            return {
                "configured": True,
                "status": "SMTP_TLS_FAILED",
                "provider": self.provider,
                "smtp_host": self.smtp_host,
                "smtp_port": self.smtp_port,
                "smtp_use_tls": self.smtp_use_tls,
                "email_from": self.email_from,
                "message": "SMTP TLS negotiation failed."
            }
        except (socket.timeout, ConnectionRefusedError, OSError, Exception) as exc:
            err_sanitized = self._sanitize_error(str(exc))
            logger.warning(f"SMTP Connection Failure: {err_sanitized}")
            return {
                "configured": True,
                "status": "SMTP_CONNECTION_FAILED",
                "provider": self.provider,
                "smtp_host": self.smtp_host,
                "smtp_port": self.smtp_port,
                "smtp_use_tls": self.smtp_use_tls,
                "email_from": self.email_from,
                "message": "SMTP connection failed."
            }
        finally:
            if server:
                try:
                    server.close()
                except Exception:
                    pass

    def send_notification_email(
        self,
        notification_id: int,
        recipient_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Attempts email dispatch via SMTP provider and logs the exact delivery attempt into `notification_deliveries`.
        """
        engine = get_resilient_db_engine()
        attempt_time = datetime.datetime.utcnow()
        msg_id = f"nirman-{uuid.uuid4().hex[:12]}@{self.email_from.split('@')[-1] if '@' in self.email_from else 'nirman.gov.in'}"

        # 1. Insert PENDING Delivery Record
        insert_sql = """
        INSERT INTO notification_deliveries (
            notification_id, provider, provider_message_id, attempted_at, status, provider_response_metadata
        ) VALUES (
            :notification_id, :provider, :provider_message_id, :attempted_at, 'PENDING', :meta
        ) RETURNING id;
        """
        init_meta = json.dumps({"recipient": recipient_email, "smtp_host": self.smtp_host})
        
        delivery_id = None
        try:
            with engine.begin() as conn:
                res = conn.execute(sqlalchemy.text(insert_sql), {
                    "notification_id": notification_id,
                    "provider": self.provider,
                    "provider_message_id": msg_id,
                    "attempted_at": attempt_time,
                    "meta": init_meta
                })
                row = res.fetchone()
                if row:
                    delivery_id = row[0]
        except Exception as e:
            logger.error(f"Error initializing PENDING delivery record: {e}")

        # Check configuration
        if not self.is_configured():
            failure_reason = "Email provider unconfigured (SMTP server settings or credentials missing in environment)."
            self._record_delivery_failure(engine, delivery_id, failure_reason, recipient_email)
            return {
                "success": False,
                "status": "FAILED",
                "provider": self.provider,
                "provider_message_id": msg_id,
                "error": failure_reason,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }

        # Compose MIMEMessage
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.email_from_name} <{self.email_from}>"
        msg["To"] = recipient_email
        msg["Message-ID"] = msg_id

        msg.attach(MIMEText(body_text, "plain"))
        if body_html:
            msg.attach(MIMEText(body_html, "html"))

        # Dispatch via SMTP
        sent_time = None
        try:
            if self.smtp_use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=5)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=5)

            if self.smtp_use_tls and not self.smtp_use_ssl:
                server.starttls()

            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.email_from, [recipient_email], msg.as_string())
            server.quit()

            sent_time = datetime.datetime.utcnow()
            status = "SENT"
            
            # Update delivery record to SENT
            update_sql = """
            UPDATE notification_deliveries
            SET status = 'SENT', sent_at = :sent_at, provider_response_metadata = :meta
            WHERE id = :delivery_id;
            """
            sent_meta = json.dumps({"recipient": recipient_email, "smtp_host": self.smtp_host, "status_code": 250, "note": "Message accepted by SMTP server for delivery"})
            if delivery_id:
                with engine.begin() as conn:
                    conn.execute(sqlalchemy.text(update_sql), {
                        "sent_at": sent_time,
                        "meta": sent_meta,
                        "delivery_id": delivery_id
                    })

            logger.info(f"✅ Notification email successfully accepted by SMTP server for recipient: {recipient_email}")
            return {
                "success": True,
                "status": "SENT",
                "provider": self.provider,
                "provider_message_id": msg_id,
                "error": None,
                "timestamp": sent_time.isoformat()
            }

        except Exception as e:
            err_sanitized = self._sanitize_error(str(e))
            logger.error(f"❌ Failed to dispatch email to {recipient_email}: {err_sanitized}")
            self._record_delivery_failure(engine, delivery_id, err_sanitized, recipient_email)
            return {
                "success": False,
                "status": "FAILED",
                "provider": self.provider,
                "provider_message_id": msg_id,
                "error": err_sanitized,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }

    def _sanitize_error(self, err_msg: str) -> str:
        if self.smtp_password and self.smtp_password in err_msg:
            return err_msg.replace(self.smtp_password, "******")
        return err_msg

    def _record_delivery_failure(self, engine, delivery_id: Optional[int], failure_reason: str, recipient_email: str):
        if not delivery_id:
            return
        update_sql = """
        UPDATE notification_deliveries
        SET status = 'FAILED', failure_reason = :reason, provider_response_metadata = :meta
        WHERE id = :delivery_id;
        """
        failed_meta = json.dumps({"recipient": recipient_email, "smtp_host": self.smtp_host, "error": failure_reason})
        try:
            with engine.begin() as conn:
                conn.execute(sqlalchemy.text(update_sql), {
                    "reason": failure_reason,
                    "meta": failed_meta,
                    "delivery_id": delivery_id
                })
        except Exception as e:
            logger.error(f"Error updating FAILED delivery status: {e}")


email_service = EmailService()
