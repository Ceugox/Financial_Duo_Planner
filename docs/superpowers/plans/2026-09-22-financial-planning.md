# Financial Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o organizador do casal em um plano financeiro rastreável de 5 e 10 anos, com Open Finance confiável e insights ligados a metas.

**Architecture:** Preservar os contratos existentes e acrescentar modelos e endpoints de planejamento. Isolar cálculo de projeção em serviço puro. Melhorar a integração Pluggy sem apagar dados manuais ou históricos. Construir a experiência de plano sobre as novas APIs.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Python; React, TypeScript, TanStack Query, Recharts e CSS existente.

## Global Constraints

- Preservar `.claude/` e quaisquer alterações preexistentes.
- Não acessar nem imprimir `backend/.env` ou dados do banco local.
- Não enviar credenciais Pluggy ao frontend; token de conexão é emitido pelo backend autenticado.
- Manter importação OFX e rotas existentes compatíveis.
- Indicar claramente dados observados, manuais e projetados, cobertura e premissas.
- O usuário já autorizou implementação; publicação e conexão de contas reais não fazem parte desta execução.

---

### Task 1: Segurança e integridade da sincronização Pluggy

**Files:** `backend/app/routers/connections.py`, `backend/app/models/investment.py`, `backend/app/models/bank_connection.py`, `backend/app/database.py`, novos testes backend.

**Interfaces:** Manter `POST /connections/{id}/sync-investments`, mas tornar `remove_manual` não destrutivo. Resposta deve contar posições criadas, atualizadas e marcadas inativas. Conexão deve expor `last_sync_attempt_at`, `last_sync_error`, `status`.

- [ ] Criar testes de regressão para posição manual preservada, posição externa ausente marcada inativa e falha Pluggy sem apagar dados.
- [ ] Executar os testes e confirmar falha antes da alteração.
- [ ] Implementar migração de colunas idempotente, status da conexão, conciliação e histórico de posições; remover o apagamento global de manuais.
- [ ] Executar testes focados, verificar retorno da API e revisar o diff.

### Task 2: Fluxo de conexão e transparência da origem

**Files:** `backend/app/services/pluggy.py`, `backend/app/routers/connections.py`, `frontend/src/api/connections.ts`, `frontend/src/pages/ConnectionsPage.tsx`, novos testes backend.

**Interfaces:** `POST /connections/connect-token` entrega token temporário para Pluggy Connect; `POST /connections` valida o item retornado e o associa ao usuário. Quando o recurso não estiver habilitado, a interface mantém entrada manual e OFX, sem promessa de gratuidade.

- [ ] Testar emissão autenticada do token e falhas do provedor.
- [ ] Implementar endpoint e fluxo no frontend sem persistir segredo no navegador.
- [ ] Exibir cobertura, estado, última tentativa e erro por conexão; explicar claramente alternativas de importação.
- [ ] Verificar fluxo sem configuração Pluggy, build e lint.

### Task 3: Modelo de metas e eventos futuros

**Files:** `backend/app/models/purchase_goal.py`, `backend/app/schemas/purchase_goal.py`, `backend/app/routers/purchase_goals.py`, `backend/app/database.py`, novos `backend/app/models/plan_event.py`, `backend/app/models/plan_settings.py`, `backend/app/routers/plan.py`, novos testes backend.

**Interfaces:** Objetivo recebe `monthly_contribution >= 0` e `saved_amount_source`. `GET/PUT /plan/settings` guarda premissas; CRUD `/plan/events` guarda mudanças futuras de renda e despesas. Escopo do plano deve corresponder ao espaço compartilhado do casal e respeitar autenticação.

- [ ] Testar criação, edição e validação de metas, premissas e eventos.
- [ ] Implementar modelos, migração idempotente, schemas e endpoints.
- [ ] Executar testes focados e conferir compatibilidade do objetivo antigo.

### Task 4: Motor de projeção e insights ligados a metas

**Files:** novos `backend/app/services/planning.py`, `backend/app/routers/plan.py`, `backend/app/routers/insights.py`, novos testes backend.

**Interfaces:** `GET /plan/projection` retorna capacidade mensal observada em meses fechados, alocação de cada meta, projeção mensal de 120 meses, cenários e avisos sobre dados incompletos. Cada insight de meta fornece fato, impacto, ação, premissas e período da evidência.

- [ ] Testar múltiplas metas competindo pelo mesmo caixa, inflação, retorno, eventos futuros, prazo vencido e ausência de histórico.
- [ ] Implementar funções puras de cálculo antes de integrar a consulta SQL.
- [ ] Corrigir comparação enganosa entre mês parcial e fechado em `/insights`.
- [ ] Executar testes focados, documentar fórmula e validar que não há previsão sem evidência.

### Task 5: Experiência de plano no frontend

**Files:** novos `frontend/src/api/plan.ts`, `frontend/src/pages/PlanPage.tsx`, componentes em `frontend/src/components/plan/`, `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/GoalsPage.tsx`, `frontend/src/components/goals/GoalForm.tsx`, `frontend/src/components/goals/GoalCard.tsx`.

**Interfaces:** Consumir os contratos da Task 3 e 4. Apresentar metas de 5 e 10 anos, aporte por meta, patrimônio informado, eventos futuros, comparação de cenários e avisos de cobertura. Mostrar o resumo do plano no dashboard.

- [ ] Construir estados vazio, carregando, erro e dados insuficientes.
- [ ] Permitir editar premissas e eventos sem perder metas anteriores.
- [ ] Diferenciar valores observados, informados e projetados na tela e nos gráficos.
- [ ] Executar `npm run build` e `npm run lint`; corrigir falhas pertinentes.

### Task 6: Acessibilidade e linguagem financeira

**Files:** `frontend/src/components/goals/GoalForm.tsx`, `frontend/src/components/goals/GoalCard.tsx`, `frontend/src/pages/AnalysisPage.tsx`, `frontend/src/components/dashboard/ForecastCard.tsx`, demais componentes alterados nas tarefas anteriores.

- [ ] Associar rótulos aos campos, nomear botões de ícone e dar resumo textual para gráficos financeiros.
- [ ] Trocar rótulos que insinuem disponibilidade de dinheiro ou precisão maior que a evidência permite.
- [ ] Verificar navegação por teclado e estados de erro nos fluxos principais.

### Task 7: Integração e validação final

**Files:** `README.md`, documentação de API/plano, testes focados de backend e frontend conforme necessidade.

- [ ] Revisar alterações de cada frente e resolver conflitos de contrato.
- [ ] Rodar testes backend, `npm run build`, `npm run lint` e `git diff --check`.
- [ ] Fazer revisão de integridade financeira: sem dupla contagem, sem exclusão silenciosa, sem projeção apresentada como garantia.
- [ ] Registrar limitações de cobertura e requisitos externos da Pluggy.


### Task 8: Sessão adequada a dados financeiros

**Files:** `backend/app/routers/auth.py`, `backend/app/schemas/auth.py`, `frontend/src/api/auth.ts`, `frontend/src/api/client.ts`, `frontend/src/api/authSession.ts`, `frontend/src/store/authStore.ts`, `frontend/src/components/layout/ProtectedRoute.tsx`.

**Interfaces:** Refresh token em cookie HttpOnly, Secure em produção e SameSite=Lax; access token somente na memória do cliente. Login e refresh retornam access_token; bootstrap após recarga usa o cookie. Logout remove o cookie.

- [ ] Testar login, refresh por cookie, recarga e logout.
- [ ] Implementar cookie no backend e withCredentials no cliente, sem gravar tokens em localStorage.
- [ ] Validar CORS e fluxos de expiração de sessão.
