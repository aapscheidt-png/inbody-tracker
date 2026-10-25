# Wealth Intelligence AI — V2.0 (branch de pesquisa)

Aplicativo independente de inteligência patrimonial com interface mobile-first/PWA para iPhone.

## Integração de extratos históricos sem custos conhecidos (V1.3)
- Importação local de backups JSON que trazem saldos por ativo sem quantidade real ou preço médio, com campos `costKnown:false` e unidade contábil 1.
- Fluxos de aportes e retiradas não conciliados são marcados `flowKnown:false`; os indicadores TIR, retorno ajustado por aportes e benchmark são suprimidos nesses casos.
- Essas posições valorizadas pelo saldo em BRL **não devem ser interpretadas como quantidade de cotas**. O aplicativo mostra apenas valor registrado e composição patrimonial.
- Dados financeiros pessoais não estão neste repositório; o usuário importa o backup pelo menu de dados. Conservar arquivo privado.
- Ao importar backup, os dados locais existentes serão substituídos. Recomenda-se exportar backup antes.
- Dados do extrato de maio de 2026 são históricos; atualizar com extrato atual antes de considerar as informações vigentes.

## V3 em pesquisa: UX orientada a produto e tempo (sem produção)

Este conjunto de mudanças **não foi publicado no GitHub Pages**. A versão anterior continua disponível até revisão do fluxo no iPhone e validação do usuário.

- Modelo derivado sem mutações na base financeira original: classificação independente por **produto, exposição, conta, localização e liquidez informada**. Fundos Trend Ouro, Trend Prata, Trend IA e ARX Fuji RF são fundos na vista *Produto*, com exposições econômicas separadas; o investimento identificado como `FUNDO  FGTS` é exibido em **Fundos de investimento**, mantendo o nome original e sem supor sua exposição econômica. O filtro de liquidez é oculto enquanto a base não informar condições de resgate.
- Quatro entradas principais no mobile: **Resumo, Carteira, Evolução, Proventos**. Filtros reais de produto/exposição/conta/localização/liquidez na Carteira, com subtotais consistentes e detalhamento por investimento.
- Evolução usa os **35 fechamentos mensais históricos** sem conectar saldos provisórios de outubro à linha de setembro. Filtragens por classe geram séries marcadas como **parciais** e não calculam rentabilidade nem suposta variação completa com cobertura incompleta.
- A previdência aparece em destaque, com a soma dos dois contratos; se a base carregada não corresponder ao subtotal do Excel, um alerta explícito substitui qualquer indicação de saldo validado.
- Detalhes contextuais com origem, data e moeda original; sem inventar cotas, preços médios, liquidez, retorno ou instituições.
- Reprodução/QA em navegador móvel com dados **inteiramente sintéticos** e captura das quatro telas. Nenhum valor financeiro privado é salvo no repositório.
- A carteira permanece em localStorage e a importação pelo Excel/JSON exige ação do usuário. A V3 não sincroniza os saldos do iPhone automaticamente.

## V2.4 · Integridade do backup e recuperação no iPhone

- **Nunca apresentar valores fictícios por acidente:** quando o armazenamento local estiver ilegível, o aplicativo inicia sem carteira e exibe alerta explícito, em vez de apresentar o modo demonstração como se fosse patrimônio real.
- A pessoa pode baixar uma cópia dos dados brutos do armazenamento local e importar um backup JSON privado, sem envio remoto.
- Importação JSON verifica novamente os quatro subtotais do Excel e a integridade das posições. Quando houver valores alterados, exige confirmação explícita e remove o selo de conferido.
- Importações são gravadas primeiro no armazenamento local; somente após o salvamento bem-sucedido o aplicativo substitui a carteira exibida.
- Após carregar um backup, o app identifica nome do arquivo original, data de importação local, soma e número de posições.
- Testes automatizados simulam corrupção do armazenamento, restauração do backup e ausência de troca silenciosa para carteira fictícia.
- **Atenção:** backups e armazenamento local não são criptografados pelo próprio aplicativo. Guarde os arquivos privados em local seguro, sem anexá-los ao GitHub público.

## Correção V2.3 · Fontes conferidas por subtotal

- O painel principal exibe a **soma dos últimos saldos disponíveis**, não a célula `Dashboard!B6`, que utiliza criptoativos de setembro e outros saldos de outubro.
- O total é **provisório**, pois a previdência de setembro não é um fechamento integral em outubro.
- Antes de aceitar um XLSX, o importador compara os saldos convertidos e classificados das posições com quatro fontes independentes: Brasil `2026!X72`, exterior `2026!L86`, previdência `2026!K116+K117` e cripto `2026!L121+L122`. Divergências interrompem a importação; os dados anteriores são preservados.
- O app exibe as quatro referências, a última competência, o nome do arquivo, a data de importação e uma impressão SHA-256 calculada **localmente**, para identificar importações antigas no iPhone.
- Dados pessoais não são publicados no GitHub. Os testes de regressão usam Excel fictício, enquanto a planilha fornecida pelo usuário é auditada somente localmente.
- O Dashboard original permanece visível no quadro de conciliação, explicitamente separado dos subtotais confirmados. Resultados reais exigem extratos atualizados e conciliação dos fluxos.

## V2.2: Proventos históricos e conferência rastreável

- A aba Histórico › Aportes e proventos apresenta **proventos por ano**, totais separados de dividendos de ações e rendimentos de FIIs e distribuição por mês, sem transformar os lançamentos em rentabilidade auditada.
- Registros detalhados de ações não são somados novamente quando existe total consolidado da mesma competência. Lançamentos repetidos de ano anterior são deduplicados com origem preservada.
- **Exportar conferência do Excel CSV**, na tela inicial ou em Configurações, gera no próprio dispositivo valores originais do Dashboard, valores recalculados, os 35 meses, investimentos atuais, referências de células e alertas. Esse arquivo é privado e não é enviado ao GitHub.
- Exportação/importação de posições CSV preserva **custo de aquisição desconhecido**, posição valorizada por saldo contábil, data de competência, classe previdência ou metais e conta/agrupamento. Não usar custo zero como substituto de custo desconhecido.
- A consolidação de pagamentos registrados **não comprova caixa recebido ou liquidez** nem determina se dividendos foram reinvestidos.
- Indicadores de retorno continuam indisponíveis até conciliar aportes externos e custos de aquisição.

## Wealth Data Engine V2 (importação Excel nativa, somente local)

O importador de arquivos `.xlsx` reconhece o formato de acompanhamento do usuário com abas patrimoniais `2024`, `2025` e `2026`. O processamento usa os recursos nativos ZIP/XML do navegador, **sem enviar o arquivo a um servidor**. Ignora inteiramente abas externas ao escopo de investimentos (p.ex., pagamentos, folha ou dados de terceiros).

Características:
- Reconstrói séries datadas de saldos por ativo e de carteira, preservando a aba e a célula de origem, incluindo saldos históricos de posições já encerradas.
- Diferencia posições atuais de ativos que desapareceram da última observação; não soma a posição antiga ao saldo vigente.
- Reconcilia o fechamento de setembro quando a fórmula usa uma observação doméstica de data errada; usa fonte canônica quando abas se contradizem na virada de ano, emitindo alerta.
- Mantém as datas de competência mensal distintas das observações diárias. O panorama de outubro é **provisório** quando a previdência não está atualizada para o mesmo mês.
- Armazena aportes declarados, dividendos, rendimentos de FIIs e taxas USD/BRL históricas em conjuntos separados, com proveniência; esses dados **não são considerados fluxos externos certificados**.
- Preço médio e quantidade não informados **continuam desconhecidos**. Saldos históricos são representados por `units:1` e `valuationOnly:true` como proxy contábil, não como número real de cotas.
- Nenhuma TWR, TIR, lucro por ativo ou comparação com benchmark é calculada como rentabilidade real até que os fluxos externos estejam conciliados.

O importador exibe uma **prévia** com contagens e alerta de competências diferentes antes de qualquer confirmação. Importar substitui posições/histórico no navegador; exporte backup JSON para proteção. A precisão e abrangência do parser estão vinculadas ao layout explicitamente reconhecido: novos modelos e fontes exigem testes de mapeamento antes de serem incorporados.

**Privacidade:** nem os arquivos originais nem os dados importados estão no GitHub. Artefatos CI usam um workbook inteiramente sintético. O aplicativo não faz sincronização remota, e armazenamento local não substitui uma cópia segura.

## Novidades V1.2
- TIR anualizada aproximada (dinheiro ponderado) baseada em fluxos datados e valores patrimoniais, com tratamento explícito de soluções múltiplas.
- Referência hipotética anual configurável e comparação em reais, aplicando as mesmas entradas e saídas de capital.
- Importação de carteira por CSV (modelo exportável), sem misturar posições reais e dados fictícios do demo.
- CSV exportado com proteção básica contra injeção de fórmulas ao abrir em planilhas.
- Testes automatizados adicionais de retornos com aportes/retiradas e validadores de importação.

## Novidades V1.1\n- Visual aprimorado conforme mockup aprovado: fundo azul-marinho, acentos esmeralda/azul, cartões e índice circular.\n- Filtros temporais 1M/3M/6M/1A/Tudo no gráfico inicial.\n- Ponte patrimonial com aportes líquidos e retorno estimado, calculados de séries de patrimônio.\n- Identificação de patamares patrimoniais atingidos nas datas observadas.\n- Exibição do P10 e P90 além da mediana e chance da meta.\n- Calibração *opcional* de retorno e volatilidade com histórico, habilitada apenas com pelo menos 12 intervalos válidos ao longo de 12 meses.\n- Testes extras da lógica financeira, consistência de IDs e sintaxe no GitHub Actions.\n\n## Funcionalidades
- Visão consolidada da carteira, distribuição por classe, custo e variação não realizada.
- Cadastro, edição e exclusão de ativos BRL e USD; conversão manual de moeda.
- Simulações Monte Carlo (1.000 trajetórias independentes), percentis P10/P50/P90, chance estimada de atingir meta e valor deflacionado.
- Diagnósticos explicáveis de concentração, diversificação, atualização de preços e completude histórica.
- Séries históricas manuais de patrimônio e fluxos de aportes líquidos.
- Exportação de backup JSON, importação validada e CSV de posições.
- PWA com suporte offline após primeira visita.

## Privacidade e dados
A versão publicada contém **apenas uma carteira de demonstração fictícia**, identificada no app. O projeto não tem integrações com corretoras, scripts externos, API de cotações nem telemetry. A carteira inserida pelo visitante é salva no localStorage do próprio navegador e **não é sincronizada nem criptografada**. Backups exportados precisam de armazenamento seguro. Não é adequado para armazenar senhas ou números de conta.

## Método e limitações financeiras
- Valor de posição: quantidade x preço unitário x câmbio manual vigente. Custo médio em USD convertido ao mesmo câmbio do dia, logo **não calcula o retorno cambial histórico corretamente**; o retorno exibido é indicativo.
- Rentabilidade patrimonial de cada intervalo: (patrimônio final - fluxo líquido informado no intervalo) / patrimônio inicial - 1. Hipótese aproximada de fluxo no final do período; **não equivale a TWR auditado ou XIRR**.
- Simulação mensal: retornos lognormais independentes com retorno aritmético anualizado aproximado e volatilidade anual constante, aportes ao fim do mês, aleatoriedade determinística para reprodução. 1.000 caminhos; P10/P50/P90 não são limites de confiança; chance é fração de caminhos acima da meta no horizonte.
- Premissas **não calibradas** por retornos históricos das posições; não considera custos, impostos, defaults, correlação entre classes, risco de liquidez nem mudanças estruturais de mercado.
- Não há cotações em tempo real, IA generativa, ordens de compra/venda ou recomendação automática de ativos.

## Testes\n\`\`\`bash\nnode --test tests/*.test.cjs\n\`\`\`\n\n## Executar
```bash
node server.js
# http://localhost:3000
```
Ou construir o Dockerfile com a pasta `wealth-intelligence` como raiz de build.

## Hospedagem independente no Vercel

[**Publicar o Wealth Intelligence no Vercel (um clique)**](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faapscheidt-png%2Finbody-tracker&root-directory=wealth-intelligence)

O projeto contém `vercel.json` e pode ser publicado como site estático sem credenciais nem serviços de banco. No Vercel, importe `aapscheidt-png/inbody-tracker`, configure **Root Directory: `wealth-intelligence`**, selecione **Framework: Other** e não configure build nem variáveis de ambiente. O domínio atribuído será exclusivo do Wealth Intelligence AI. Verifique o endereço de produção e os recursos de importação antes de inserir dados reais.

Até a hospedagem ser conectada/configurada, o código está publicado no GitHub, mas não há um URL de produção do novo app confirmado. Importar o repositório com a raiz do Health Tracker, em vez da subpasta, pode publicar outro app: confira a raiz.

## Desenvolvimento futuro
Autenticação passkey/Face ID vinculada a conta, backend isolado, histórico de transações datadas, TWR e XIRR precisos, integração com provedores autorizados, custos/tributação, benchmark CDI/IPCA e análise de risco com covariância.

## Isolamento
O código foi criado em `wealth-intelligence-v1` de `aapscheidt-png/inbody-tracker`, exclusivamente por limitação de criação de novos repositórios no conector. **A branch main do Health Tracker não foi alterada**. Serviço Railway dedicado usa a raiz `/wealth-intelligence`.
