"""Pydantic models for the CNN Dashboard API"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from uuid import UUID


class ExpedicaoCreate(BaseModel):
    cliente: str = Field(min_length=1, max_length=200)
    horario_planejado: str = Field(pattern=r"^\d{2}:\d{2}$")  # "HH:MM"
    peso_previsto_kg: float = Field(default=0, ge=0, le=999999)
    observacoes: Optional[str] = Field(default=None, max_length=500)
    turno: Literal["manha", "tarde", "noite"] = "manha"
    planta: str = Field(default="CNN", max_length=50)


class ExpedicaoConcluir(BaseModel):
    horario_real: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    peso_expedido_kg: Optional[float] = Field(default=None, ge=0, le=999999)


class ExpedicaoUpdate(BaseModel):
    horario_planejado: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    peso_previsto_kg: Optional[float] = Field(default=None, ge=0, le=999999)
    observacoes: Optional[str] = Field(default=None, max_length=500)


class ProducaoCreate(BaseModel):
    tipo: Literal["entrada", "saida"]
    peso_kg: float = Field(gt=0, le=999999)
    cliente: Optional[str] = Field(default="Geral Planta", max_length=200)
    turno: Literal["manha", "tarde", "noite"] = "manha"
    planta: str = Field(default="CNN", max_length=50)
    origem: Literal["manual", "excel", "api", "mock"] = "manual"


class NPSCreate(BaseModel):
    nota: int = Field(ge=0, le=10)
    emoji: Optional[Literal["happy", "neutral", "sad"]] = None
    comentario: Optional[str] = Field(default=None, max_length=1000)
    pagina: str = Field(default="dashboard", max_length=100)
    turno: Optional[str] = Field(default=None, max_length=20)


class AIQuestion(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class EstoqueCreate(BaseModel):
    produto: str = Field(min_length=1, max_length=200)
    categoria: Literal["materia_prima", "produto_acabado", "insumo", "embalagem", "quimico"] = "produto_acabado"
    quantidade: float = Field(default=0, ge=0, le=9999999)
    unidade: Literal["kg", "un", "pallet", "cx", "litro"] = "kg"
    estoque_minimo: float = Field(default=0, ge=0, le=9999999)
    localizacao: Optional[str] = Field(default=None, max_length=100)
    fornecedor: Optional[str] = Field(default=None, max_length=200)
    valor_unitario: float = Field(default=0, ge=0, le=999999)
    planta: str = Field(default="CNN", max_length=50)


class EstoqueUpdate(BaseModel):
    produto: Optional[str] = Field(default=None, min_length=1, max_length=200)
    categoria: Optional[Literal["materia_prima", "produto_acabado", "insumo", "embalagem", "quimico"]] = None
    quantidade: Optional[float] = Field(default=None, ge=0, le=9999999)
    unidade: Optional[Literal["kg", "un", "pallet", "cx", "litro"]] = None
    estoque_minimo: Optional[float] = Field(default=None, ge=0, le=9999999)
    localizacao: Optional[str] = Field(default=None, max_length=100)
    fornecedor: Optional[str] = Field(default=None, max_length=200)
    valor_unitario: Optional[float] = Field(default=None, ge=0, le=999999)
    planta: Optional[str] = Field(default=None, max_length=50)


class EstoqueMovimentacao(BaseModel):
    tipo: Literal["entrada", "saida", "ajuste"]
    quantidade: float = Field(gt=0, le=9999999)
    observacao: Optional[str] = Field(default=None, max_length=500)
    usuario: Optional[str] = Field(default=None, max_length=100)


class ExcelIngestao(BaseModel):
    """Schema for Excel data rows"""
    cliente: str = Field(min_length=1, max_length=200)
    horario_planejado: str = Field(pattern=r"^\d{2}:\d{2}$")
    peso_previsto_kg: Optional[float] = Field(default=0, ge=0)
    turno: Optional[str] = Field(default="manha", max_length=20)
