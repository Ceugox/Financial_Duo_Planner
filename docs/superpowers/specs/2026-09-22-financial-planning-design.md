# Planejamento financeiro de 5 e 10 anos — desenho

## Objetivo

Permitir que o casal registre pretensões financeiras, acompanhe metas de longo prazo e compare o plano com dados observados, sem tratar projeções como promessas de rendimento.

## Princípios

- Preservar lançamentos, investimentos e objetivos existentes.
- Separar valores observados, informados manualmente e projetados.
- Explicitar instituições cobertas, última atualização e falhas de sincronização.
- Nunca apagar posição manual ou histórico financeiro apenas porque uma fonte externa deixou de retornar um registro.
- Usar linguagem clara, acessível e orientada a decisões em português.

## Arquitetura

O backend continua em FastAPI/SQLAlchemy. A camada de planejamento recebe objetivos com aporte mensal e premissas editáveis, além de eventos futuros de renda e despesa. Um serviço determinístico calcula capacidade de aporte a partir de meses fechados, distribui os aportes entre metas e produz projeções mensais nos horizontes de 5 e 10 anos. O resultado expõe premissas, cobertura dos dados e diferenças entre o plano e o ritmo observado.

A integração Pluggy preserva a importação OFX, usa conexão pelo widget quando disponível e registra estado, tentativa e erro de sincronização. Posições sincronizadas passam a ser conciliadas por identificador de origem; posições que desaparecerem ficam inativas e preservam histórico. A interface apresenta um resumo do plano no dashboard e uma página própria para editar metas, premissas e eventos e comparar cenários.

## Regras de cálculo

- O histórico para capacidade de aporte usa meses fechados com dados; o mês corrente é mostrado separadamente.
- A soma dos aportes planejados é comparada à capacidade calculada. Cada meta recebe apenas o próprio aporte.
- Projeções são mensais, em valores nominais e reais, com inflação e retorno anual definidos pelo usuário. Usar capitalização mensal consistente e arredondamento monetário na saída.
- Uma meta sem aporte, prazo ou dados suficientes exibe estado incompleto; não recebe data de conclusão inventada.
- Os cenários conservador, base e otimista são variações explícitas de premissas, sem recomendação automática de produto financeiro.
- Aporte em objetivo é registro de planejamento; não movimenta dinheiro nem altera saldo bancário.

## Interfaces

- `GET/PUT /api/v1/plan/settings`: premissas de inflação e retorno dos cenários.
- `GET/POST/PUT/DELETE /api/v1/plan/events`: eventos futuros de renda e despesa, com data inicial, final opcional e recorrência mensal ou pontual.
- Objetivos existentes recebem `monthly_contribution` e `saved_amount_source` (`manual` ou `linked`).
- `GET /api/v1/plan/projection`: metas, capacidade histórica, projeção mensal, cenários, cobertura e avisos.
- Conexões expõem estado da fonte e atualização; um endpoint de token permite abrir Pluggy Connect sem expor `client_secret` ao navegador.

## Validação

Testar cálculos com múltiplas metas, prazo vencido, renda insuficiente, meses parciais e dados ausentes. Testar sincronização com posição ausente, erro de provedor e registros manuais. Rodar build/lint do frontend e testes do backend. Validar que o fluxo antigo de objetivos, OFX e importação de transações continua funcionando.
