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
- **Investimentos:** Acompanhamento de evolução patrimonial.
- **Objetivos:** Planejamento e progresso para metas de compra (ex: viagem, carro).
- **Categorias:** Organização personalizada de tipos de gastos.
- **Multi-usuário:** Espaço compartilhado para o casal.
