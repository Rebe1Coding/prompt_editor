from pydantic import BaseModel

# аннотации ниже обязательны: Pydantic строит валидацию тела запроса по ним


class EditRequest(BaseModel):
    prompt: str


class RefineRequest(BaseModel):
    instruction: str
