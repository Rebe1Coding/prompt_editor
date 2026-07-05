from pydantic import BaseModel

# аннотации ниже обязательны: Pydantic строит валидацию тела запроса по ним


class EditRequest(BaseModel):
    prompt: str
    search: bool = True


class RefineRequest(BaseModel):
    instruction: str
    search: bool = True


class RegenerateRequest(BaseModel):
    search: bool = True
