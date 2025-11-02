from typing import Union
from fastapi import FastAPI
from auth import app as auth_app

app = FastAPI()
app.mount("/auth", auth_app)

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
