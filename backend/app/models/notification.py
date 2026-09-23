import datetime
import json
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from backend.app.models.user import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_code = Column(String(64), nullable=False, index=True)
    alert_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(32), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, INFO
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    trigger_reason = Column(Text, nullable=False)
    risk_score = Column(Float, nullable=True)
    predicted_severe_risk_probability = Column(Float, nullable=True)
    risk_category = Column(String(32), nullable=True)
    risk_drivers = Column(Text, nullable=True)  # JSON string
    recommended_actions = Column(Text, nullable=True)  # JSON string
    dedup_hash = Column(String(128), unique=True, index=True, nullable=False)
    triggered_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, index=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    metadata_json = Column(Text, nullable=True)

    def to_dict(self):
        drivers = []
        if self.risk_drivers:
            try:
                drivers = json.loads(self.risk_drivers)
            except Exception:
                drivers = []

        recs = []
        if self.recommended_actions:
            try:
                recs = json.loads(self.recommended_actions)
            except Exception:
                recs = []

        meta = {}
        if self.metadata_json:
            try:
                meta = json.loads(self.metadata_json)
            except Exception:
                meta = {}

        return {
            "id": self.id,
            "project_code": self.project_code,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "trigger_reason": self.trigger_reason,
            "risk_score": self.risk_score,
            "predicted_severe_risk_probability": self.predicted_severe_risk_probability,
            "risk_category": self.risk_category,
            "risk_drivers": drivers,
            "recommended_actions": recs,
            "dedup_hash": self.dedup_hash,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "status": self.status,
            "metadata": meta,
        }


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(32), nullable=False, default="IN_APP")  # IN_APP, EMAIL
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), nullable=False, default="UNREAD", index=True)  # UNREAD, READ, DISMISSED

    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "recipient_user_id": self.recipient_user_id,
            "channel": self.channel,
            "title": self.title,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "status": self.status,
        }


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(64), nullable=False)  # SMTP, CONSOLE
    provider_message_id = Column(String(255), nullable=True)
    attempted_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), nullable=False, index=True)  # PENDING, SENT, DELIVERED, FAILED
    failure_reason = Column(Text, nullable=True)
    provider_response_metadata = Column(Text, nullable=True)

    def to_dict(self):
        meta = {}
        if self.provider_response_metadata:
            try:
                meta = json.loads(self.provider_response_metadata)
            except Exception:
                meta = {}

        return {
            "id": self.id,
            "notification_id": self.notification_id,
            "provider": self.provider,
            "provider_message_id": self.provider_message_id,
            "attempted_at": self.attempted_at.isoformat() if self.attempted_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "status": self.status,
            "failure_reason": self.failure_reason,
            "provider_response_metadata": meta,
        }


class UserNotificationPreference(Base):
    __tablename__ = "user_notification_preferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    email_enabled = Column(Boolean, nullable=False, default=True)
    in_app_enabled = Column(Boolean, nullable=False, default=True)
    critical_alerts_only = Column(Boolean, nullable=False, default=False)
    cost_alerts_enabled = Column(Boolean, nullable=False, default=True)
    schedule_alerts_enabled = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email_enabled": self.email_enabled,
            "in_app_enabled": self.in_app_enabled,
            "critical_alerts_only": self.critical_alerts_only,
            "cost_alerts_enabled": self.cost_alerts_enabled,
            "schedule_alerts_enabled": self.schedule_alerts_enabled,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
