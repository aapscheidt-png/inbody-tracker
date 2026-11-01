# Auditoria técnica e funcional | Wealth Intelligence V3.2

**Escopo:** PR #9 (branch de pesquisa). O projeto anterior e o GitHub Pages não podem ser alterados sem aprovação explícita. Nenhum Excel real, extrato, backup pessoal, e-mail ou dado da carteira é enviado à CI ou gravado no GitHub.

## Resultado por dimensão

| Dimensão | Revisão e regras verificadas | Ressalvas |
|---|---|---|
| Fontes e Excel | Arquivo XLSX interpretado localmente; quatro subtotais de origem conciliados; importação inválida recusada sem substituir registros anteriores | Layout do parser é específico às abas 2024–2026; novas planilhas exigem novo mapeamento |
| Patrimônio | Posições atuais consolidadas; identificação explícita de saldos com competências distintas; histórico mensal separado de saldos provisórios | A soma de competências diferentes não representa um fechamento financeiro único |
| Custos e resultados | Posições somente com saldo não recebem custo presumido; fluxos desconhecidos não geram TWR, TIR ou resultado auditado | Rentabilidade, benchmark e aportes precisam de registros externos conciliados |
| Gráficos | R$ / US$, mês/ano e ano parcial identificados; lacunas não são interpoladas | Visualização anual representa saldo no último mês observado, não rentabilidade nem soma anual |
| UI/UX | Resumo, Carteira, Evolução e Proventos; filtros com totais coerentes; captura no Chrome e navegação no WebKit | A aparência e os downloads no Safari físico dependem de homologação do usuário |
| Privacidade | Sem backend financeiro, sem cotações externas ou ordens; CSP bloqueia conexão externa; números ocultos no modo de privacidade | LocalStorage e arquivos exportados não são criptografados pelo app; cuidado com acesso físico e compartilhamento de links |
| Persistência | Operações de edição, importação, exclusão, cenários e reset passam a salvar antes de modificar a carteira ativa; falha de gravação não pode mostrar sucesso | Testar e manter backup antes de alterar dados no iPhone; a versão não sincroniza entre dispositivos |

## Defeitos identificados e correções implementadas nesta auditoria

1. **Alta prioridade — alteração sem gravação:** operações anteriores atualizavam o estado em memória e davam confirmação mesmo quando o armazenamento local falhava. A V3 passou a usar `persistCandidate` para registrar o estado normalizado primeiro e só depois atualizar a interface. Teste de quota/erro de armazenamento acrescentado às jornadas Chromium e WebKit.
2. **Média — datas inválidas:** o carregamento de JSON aceitava datas com formato correto, mas calendário impossível. Datas de posições e fechamentos são validadas pelo calendário civil.
3. **Alta — custo fictício em balanços:** registros `valuationOnly` sem custo explícito podiam ser interpretados como custo conhecido. O custo continua desconhecido, evitando lucro fictício.
4. **Alta — fluxo não declarado:** faltas de informação sobre aportes ou retiradas deixam o status como não verificado; a ausência de um campo não equivale a afirmar fluxo zero.
5. **Baixa — base zero e variação:** a diferença percentual entre patrimônios não é produzida quando o patrimônio inicial é zero.
6. **Média — edição manual:** preserva conta/agrupamento, mas remove a alegação de origem Excel e reinicia dados de moeda de origem quando uma posição é alterada manualmente.

## Critérios de aceite antes de merge para GitHub Pages

- [ ] Testes unitários, importador nativo, jornadas Chrome e WebKit na **mesma SHA** de código: todos aprovados.
- [ ] Homologação no Safari físico após importar o Excel local com backup salvo em local seguro.
- [ ] Comparação visual das quatro telas e conferência de totais, filtros, datas e proventos na planilha.
- [ ] Confirmar comportamento ao fechar e reabrir o Safari, sair do modo privado e usar o ícone na tela inicial.
- [ ] Nenhuma informação pessoal ou credencial incorporada ao repositório ou artefatos CI.
- [ ] Aprovação explícita do usuário para alterar qualquer ambiente publicado anterior.

## Limitações intencionais

O V3.2 é um **painel histórico e patrimonial**, não um extrato de corretora e nem um livro-caixa completo. Não executa ordens; não calcula performance auditada sem fluxos corretos; não valida preços ou saldos em tempo real. O modo privado oculta a leitura casual da tela, mas não constitui criptografia. O projeto Vercel de homologação é distinto do GitHub Pages anterior.
