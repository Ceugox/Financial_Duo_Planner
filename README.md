# Organizador Financeiro do Casal 💰

Um sistema completo de gestão financeira pessoal e compartilhada, desenvolvido para ajudar casais a acompanharem suas receitas, despesas, investimentos e objetivos de compra em um só lugar.

## 🚀 Tecnologias Utilizadas

### Backend
- **Linguagem:** Python 3.10+
- **Framework:** FastAPI
- **Banco de Dados:** SQLite (SQLAlchemy ORM)
- **Segurança:** JWT (JSON Web Tokens) e Bcrypt para hashing de senhas
- **Validação:** Pydantic

### Frontend
- **Framework:** React com TypeScript
- **Ferramenta de Build:** Vite
- **Estilização:** Vanilla CSS (Design moderno e responsivo)
- **Gerenciamento de Estado:** Zustand
- **Ícones:** Lucide React
- **Gráficos:** Recharts

## 📦 Estrutura do Projeto

```text
Organizador Financeiro/
├── backend/          # API FastAPI, modelos de banco de dados e lógica
└── frontend/         # Interface React, componentes e integração com API
```

## 🛠️ Como Executar

### 1. Preparando o Backend

1.  Navegue até a pasta do backend:
    ```bash
    cd backend
    ```
2.  Crie um ambiente virtual:
    ```bash
    python -m venv venv
    ```
3.  Ative o ambiente virtual:
    - No Windows: `venv\Scripts\activate`
    - No Linux/macOS: `source venv/bin/activate`
4.  Instale as dependências:
    ```bash
    pip install -r requirements.txt
    ```
5.  Popule o banco de dados inicial (Seed):
    ```bash
    python -m app.utils.seed
    ```
6.  Inicie o servidor:
    ```bash
    uvicorn app.main:app --reload
    ```
    O backend estará disponível em `http://localhost:8000`.

### 2. Preparando o Frontend

1.  Abra um novo terminal e navegue até a pasta do frontend:
    ```bash
    cd frontend
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o projeto:
    ```bash
    npm run dev
    ```
    O frontend estará disponível em `http://localhost:5173`.

## 🔐 Credenciais de Acesso Padrão

O sistema vem pré-configurado com dois usuários para teste:

| Usuário | Email | Senha |
| :--- | :--- | :--- |
| **Usuário 1** | `usuario1@email.com` | `senha_segura_1` |
| **Usuário 2** | `usuario2@email.com` | `senha_segura_2` |

## ✨ Funcionalidades

- **Dashboard:** Visão geral de saldo, receitas, despesas e gráficos mensais.
- **Transações:** Registro detalhado de ganhos e gastos com categorização.
- **Investimentos:** Acompanhamento de evolução patrimonial; posições encerradas ficam inativas e preservadas no histórico (`GET /investments?include_inactive=true`).
- **Objetivos:** Planejamento e progresso para metas de compra (ex: viagem, carro), com aporte mensal planejado por meta.
- **Plano 5/10 anos:** Projeção do casal a partir da capacidade de aporte observada em meses fechados, cenários de retorno, eventos futuros de renda/despesa e premissas editáveis.
- **Categorias:** Organização personalizada de tipos de gastos.
- **Multi-usuário:** Espaço compartilhado para o casal — transações, plano, metas e eventos são do casal.

## 🗓️ API do plano (`/api/v1/plan`)

| Endpoint | Descrição |
| :--- | :--- |
| `GET/PUT /plan/settings` | Premissas compartilhadas: inflação anual, retorno anual hipotético, meses de histórico. |
| `GET/POST/PUT/DELETE /plan/events` | Eventos futuros de renda/despesa: data inicial, data final opcional, recorrência mensal ou única. |
| `GET /plan/projection` | Capacidade observada, alocação por meta, projeção mensal de 120 meses (nominal e real), cenários e avisos de cobertura. |
| `GET /plan/insights` | Fato, impacto e ação por meta em risco ou vencida, com premissas e período da evidência. |

Regras do cálculo (`backend/app/services/planning.py`): apenas meses fechados com receita **e** despesa contam como evidência (mínimo de 3); cada meta recebe no máximo o próprio aporte, priorizando `alta` quando a capacidade não cobre tudo; o alvo cresce pela inflação até o prazo e os saldos capitalizam mensalmente ao retorno informado. Projeções são simulações sobre premissas — nunca rendimento garantido.

## 🔌 Open Finance (Pluggy)

Configurar `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no `backend/.env` (aplicação criada em `dashboard.pluggy.ai`). Com a integração ativa:

- `POST /connections/connect-token` emite o token temporário que abre o widget Pluggy Connect no frontend — credenciais nunca chegam ao navegador.
- `POST /connections` valida o `item_id` retornado pelo widget (também aceita item cadastrado à mão no `meu.pluggy.ai`).
- `POST /connections/{id}/sync` importa contas e transações; `POST /connections/{id}/sync-investments` espelha posições.

A sincronização de investimentos **não é destrutiva**: posições que somem na corretora são marcadas `is_active=false` e ficam consultáveis no histórico; investimentos manuais nunca são removidos. Cada conexão expõe `status`, `last_sync_attempt_at`, `last_sync_error` e `coverage`. A disponibilidade de conectores e eventuais custos dependem do plano contratado com a Pluggy; sem configuração, a importação por OFX e o lançamento manual continuam funcionando.

## 🔑 Sessão

Login e `POST /auth/refresh` emitem o access token no corpo e o refresh token em cookie `finance_refresh` (`HttpOnly`, `Secure` em produção, `SameSite=Lax`, `path=/api/v1/auth`). O frontend mantém o access token apenas em memória e restaura a sessão pelo cookie após recarga; `POST /auth/logout` remove o cookie.

## 🧪 Verificação

```bash
# Backend (sqlite em memória)
pip install -r backend/requirements.txt && python -m pytest backend/tests -q

# Frontend
cd frontend && npm run lint && npm run build
```

CI em `.github/workflows/ci.yml`: um job por toolchain, nas versões do `nixpacks.toml` (Python 3.10, Node 20).
