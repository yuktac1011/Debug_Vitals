"""
SQLAlchemy ORM model package.
Import Base from here to share the same metadata across all models.
Alembic also imports Base to generate migrations.
"""

from sqlalchemy.orm import DeclarativeBase, MappedColumn
from sqlalchemy import MetaData

# Enforce a naming convention so Alembic can auto-generate constraint names.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# Re-export all models so Alembic sees them when it imports this package.
from .session import DiagnosticSession  # noqa: E402, F401
from .event import Event  # noqa: E402, F401
from .diagnosis import Diagnosis  # noqa: E402, F401
from .verification import Verification  # noqa: E402, F401
from .regression_test import RegressionTest  # noqa: E402, F401

__all__ = [
    "Base",
    "DiagnosticSession",
    "Event",
    "Diagnosis",
    "Verification",
    "RegressionTest",
]
