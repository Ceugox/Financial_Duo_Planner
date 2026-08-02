"""Parser OFX minimalista (stdlib) para extratos bancários brasileiros.

OFX 1.x é SGML (tags sem fechamento); OFX 2.x é XML. Este parser cobre os
dois lendo tag a tag dentro de cada bloco <STMTTRN>...</STMTTRN>, que é o
que Nubank, Inter e Itaú exportam.
"""
import re
from dataclasses import dataclass
from datetime import date


@dataclass
class OfxTransaction:
    fitid: str
    date: date
    amount: float  # positivo = crédito, negativo = débito
    description: str


_TXN_BLOCK = re.compile(r"<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>)|$)", re.S | re.I)
_TAG = re.compile(r"<([A-Z0-9_.]+)>([^<\r\n]*)", re.I)


def _parse_ofx_date(raw: str) -> date:
    # Formatos: YYYYMMDD, YYYYMMDDHHMMSS, YYYYMMDDHHMMSS[-3:BRT]
    digits = re.sub(r"[^0-9].*$", "", raw.strip())
    return date(int(digits[0:4]), int(digits[4:6]), int(digits[6:8]))


def _parse_amount(raw: str) -> float:
    # Alguns bancos usam vírgula decimal
    return float(raw.strip().replace(",", "."))


def parse_ofx(content: str) -> list[OfxTransaction]:
    transactions: list[OfxTransaction] = []
    for block_match in _TXN_BLOCK.finditer(content):
        fields: dict[str, str] = {}
        for tag_match in _TAG.finditer(block_match.group(1)):
            fields[tag_match.group(1).upper()] = tag_match.group(2).strip()

        raw_date = fields.get("DTPOSTED")
        raw_amount = fields.get("TRNAMT")
        if not raw_date or not raw_amount:
            continue

        try:
            tx_date = _parse_ofx_date(raw_date)
            amount = _parse_amount(raw_amount)
        except (ValueError, IndexError):
            continue

        description = fields.get("MEMO") or fields.get("NAME") or "Sem descrição"
        fitid = fields.get("FITID") or f"{raw_date}:{raw_amount}:{description[:40]}"

        transactions.append(OfxTransaction(
            fitid=fitid,
            date=tx_date,
            amount=amount,
            description=description[:255],
        ))
    return transactions
