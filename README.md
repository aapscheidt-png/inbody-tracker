# InBody Tracker • Anderson

PWA responsivo, mobile-first, para acompanhar bioimpedância e composição corporal.

## Funcionalidades
- Dashboard com peso, IMC, gordura corporal e massa muscular.
- Série histórica de medições.
- Gráficos de peso, massa muscular, percentual de gordura e IMC.
- Comparação entre duas bioimpedâncias.
- Dados completos da medição de 12/09/2026, incluindo composição e análise segmentar.
- Cadastro de novas medições no próprio navegador.
- Backup e restauração via JSON.
- Instalável no iPhone/Android como PWA.
- Sem dependências externas.

## Dados incluídos
O app foi inicializado com as medições disponíveis no histórico, de 03/02/2026 a 12/09/2026. O peso aproximado de 93,8 kg do início de 2026 é usado apenas como referência de trajetória, não como bioimpedância datada.

## Privacidade
A versão atual contém dados pessoais de saúde pré-carregados em `app.js`. **Não publique este repositório como público** sem antes remover ou proteger esses dados. Medições adicionadas depois ficam em `localStorage` no navegador.

## Rodar localmente
```bash
python3 -m http.server 8080
```
Abra `http://localhost:8080`.

## GitHub Pages
Depois de colocar os arquivos em um repositório apropriado, habilite Pages para a branch principal e a raiz do projeto. Para manter os dados privados, prefira um repositório/ambiente privado ou uma arquitetura em que os dados pessoais não fiquem versionados no código-fonte.
