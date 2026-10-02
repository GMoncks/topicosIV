from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    header_url = Column(String(500), nullable=True)
    category = Column(String(50), default="Geral", index=True)
    is_private = Column(Boolean, default=False)
    owner_id = Column(Integer, nullable=False, index=True)
    members_count = Column(Integer, default=1)
    posts_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    posts = relationship("ForumPost", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("GroupMessage", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    role = Column(String(20), default="member")  # owner, moderator, member
    joined_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="members")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_user_membership"),
    )
