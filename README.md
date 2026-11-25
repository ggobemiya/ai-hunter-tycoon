# AI 헌터 타이쿤 · 개발자 HTML 배포

## 현재 배포 방식 (2026-11-25)

`!파일` 업로드는 종료했습니다. https://stormflowerm.github.io/AI-Web-Hunter/ 의 공개 파일을 운영 서버에서 5분마다 확인해 이 저장소로 동기화합니다.
HTML뿐 아니라 JS·CSS·이미지·매니페스트·서비스 워커를 함께 반영하며, 변경 시에만 커밋합니다.
이전 버전은 `docs/releases/upstream-시간-해시/`에 보관하고 `docs/upstream-sync.json`에 파일별 해시를 기록합니다.
수집/검증에 실패하면 기존 게시본을 유지합니다. 아래 HTML 수동 업로드 설명은 이전 운영 기록입니다.

다른 개발자가 제공한 단일 HTML 게임의 배포 저장소입니다. 게임 원본의 내용·저장 키·밸런스를 변경하지 않고 버전별 파일을 보관합니다. 원작에 임의의 오픈소스 라이선스를 부여하지 않습니다.

- 최신 플레이: https://ggobemiya.github.io/ai-hunter-tycoon/
- v17 고정본: https://ggobemiya.github.io/ai-hunter-tycoon/releases/v17/
- 현재 버전 정보: https://ggobemiya.github.io/ai-hunter-tycoon/version.json
- 초기 원본: `2d (17).html` (671,512 bytes)
- GitHub Pages: main 브랜치 `/docs`

## 새 HTML로 교체

Git과 GitHub 인증이 설정된 체크아웃에서 다음을 실행합니다.

```powershell
python tools/update_game.py --source "D:\Download\2d (18).html" --version 18 --publish
```

서버 체크아웃은 `/home/radar01/sda1/coding/ai-hunter-tycoon`입니다. 파일을 서버로 보낸 뒤 같은 스크립트를 실행해도 됩니다.
`--publish`를 생략하면 파일만 준비합니다. 직접 검토한 다음 커밋·푸시할 수 있습니다.
최신 주소는 고정이고 이전 버전은 `releases/v번호/`에 남습니다. 같은 버전 번호로 다른 파일을 덮어쓰지 않습니다.
패치가 적용되지 않으면 새로고침하여 Pages/CDN 캐시 갱신을 확인합니다. 열린 탭의 게임 코드가 자동 교체되지는 않습니다.

## 진행 상황 저장

GitHub Pages는 HTML을 배포하며 게임 실행은 이용자의 브라우저에서 이뤄집니다.
이 파일은 Firebase 설정이 없으면 localStorage/IndexedDB 등 브라우저 저장을 사용합니다. 계정 기반 서버 저장을 새로 연결하지 않았습니다.
기존 로컬 HTML의 진행 상황이 새 웹 주소로 자동 이전되지는 않습니다. 게임의 저장 코드 내보내기/불러오기를 이용하세요.
동일한 github.io 출처에서 원본 게임과 같은 저장 키를 쓰는 페이지끼리는 저장소가 공유될 수 있습니다.
버전별 주소는 코드 보관용이며 진행 상황을 버전별로 격리하지 않습니다. 업데이트 전에 게임의 저장 코드를 보관하세요.

## 배포 검증

최초 배포는 원본과 index.html의 SHA-256 일치 및 포함 JavaScript 구문 검사를 통과했습니다.
전체 게임 밸런스나 모든 플레이 동작을 검증했다는 의미는 아닙니다.

## 카카오톡에서 업데이트

게임난민촌의 배포 담당자가 뱀봇에게 !파일 깃헙 업데이트 를 보내면 일회용 링크를 받습니다. 개발자는 링크를 열어 HTML을 선택하고 GitHub에 업데이트를 누르면 됩니다. 원본 분석이나 코드 변경 없이 최신 게임을 교체하고 이전 버전을 보관합니다. 같은 파일은 중복 배포하지 않습니다. 링크는 30분 유효하며 HTML은 최대 2MB입니다.

# AI 헌터 타이쿤 · 개발자 HTML 배포

다른 개발자가 제공한 단일 HTML 게임의 배포 저장소입니다. 게임 원본의 내용·저장 키·밸런스를 변경하지 않고 버전별 파일을 보관합니다. 원작에 임의의 오픈소스 라이선스를 부여하지 않습니다.

- 최신 플레이: https://ggobemiya.github.io/ai-hunter-tycoon/
- v17 고정본: https://ggobemiya.github.io/ai-hunter-tycoon/releases/v17/
- 현재 버전 정보: https://ggobemiya.github.io/ai-hunter-tycoon/version.json
- 초기 원본: `2d (17).html` (671,512 bytes)
- GitHub Pages: main 브랜치 `/docs`

## 새 HTML로 교체

Git과 GitHub 인증이 설정된 체크아웃에서 다음을 실행합니다.

```powershell
python tools/update_game.py --source "D:\Download\2d (18).html" --version 18 --publish
```

서버 체크아웃은 `/home/radar01/sda1/coding/ai-hunter-tycoon`입니다. 파일을 서버로 보낸 뒤 같은 스크립트를 실행해도 됩니다.
`--publish`를 생략하면 파일만 준비합니다. 직접 검토한 다음 커밋·푸시할 수 있습니다.
최신 주소는 고정이고 이전 버전은 `releases/v번호/`에 남습니다. 같은 버전 번호로 다른 파일을 덮어쓰지 않습니다.
패치가 적용되지 않으면 새로고침하여 Pages/CDN 캐시 갱신을 확인합니다. 열린 탭의 게임 코드가 자동 교체되지는 않습니다.

## 진행 상황 저장

GitHub Pages는 HTML을 배포하며 게임 실행은 이용자의 브라우저에서 이뤄집니다.
이 파일은 Firebase 설정이 없으면 localStorage/IndexedDB 등 브라우저 저장을 사용합니다. 계정 기반 서버 저장을 새로 연결하지 않았습니다.
기존 로컬 HTML의 진행 상황이 새 웹 주소로 자동 이전되지는 않습니다. 게임의 저장 코드 내보내기/불러오기를 이용하세요.
동일한 github.io 출처에서 원본 게임과 같은 저장 키를 쓰는 페이지끼리는 저장소가 공유될 수 있습니다.
버전별 주소는 코드 보관용이며 진행 상황을 버전별로 격리하지 않습니다. 업데이트 전에 게임의 저장 코드를 보관하세요.

## 배포 검증

최초 배포는 원본과 index.html의 SHA-256 일치 및 포함 JavaScript 구문 검사를 통과했습니다.
전체 게임 밸런스나 모든 플레이 동작을 검증했다는 의미는 아닙니다.

## 카카오톡에서 업데이트

게임난민촌의 배포 담당자가 뱀봇에게 !파일 깃헙 업데이트 를 보내면 일회용 링크를 받습니다. 개발자는 링크를 열어 HTML을 선택하고 GitHub에 업데이트를 누르면 됩니다. 원본 분석이나 코드 변경 없이 최신 게임을 교체하고 이전 버전을 보관합니다. 같은 파일은 중복 배포하지 않습니다. 링크는 30분 유효하며 HTML은 최대 2MB입니다.
