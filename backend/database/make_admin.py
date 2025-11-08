# backend/make_admin.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import User, Role

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/mydb"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

user = db.query(User).filter(User.email == "userofficeit@gmail.com").first()
admin_role = db.query(Role).filter(Role.name == "admin").first()

if user and admin_role:
    user.roles.append(admin_role)
    db.commit()
    print("✅ Admin role assigned!")

db.close()
