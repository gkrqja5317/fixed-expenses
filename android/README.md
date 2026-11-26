# 내 고정지출 — Android APK 시험판

기존 GitHub Pages PWA는 유지합니다. 이 폴더는 **별도 Android WebView 앱**의 소스 코드입니다.

## 목적
- 웹앱의 기존 화면/기능을 WebView로 불러옵니다.
- 시스템 뒤로가기를 누르면 열린 선택 목록이나 입력창부터 닫고, 다른 창이 없을 때 **안드로이드 기본 앱 종료 확인창**을 표시합니다.
- 확인 버튼을 누르면 Android `finishAndRemoveTask()`로 앱을 종료합니다.
- 종료 확인창에서 뒤로가기/취소/바깥 터치는 종료 취소로 처리합니다.

## 빌드
GitHub 저장소 → **Actions** → **Build native Android APK** → 최근 성공한 실행 → **Artifacts** → `fixed-expenses-native-debug-apk` ZIP 내려받기 → 압축 해제 후 `app-debug.apk`를 갤럭시에 설치합니다.

직접 빌드하려면 JDK 17, Android SDK 35, Gradle 8.11.1 설치 후 `gradle -p android :app:assembleDebug` 명령을 사용하세요.

**현재 빌드는 개발용 디버그 APK입니다.** 정식 배포 서명 키를 설정한 출시용 APK가 아니며 설치 시 안드로이드의 추가 보안 확인을 요구할 수 있습니다.

## 데이터 이전 — 반드시 먼저 확인
1. **기존 Chrome 설치형 고정지출 앱에서** 우측 상단 메뉴 → 데이터 관리 → **백업 저장**을 누릅니다.
2. 휴대폰의 다운로드/내 파일에 `고정지출_백업_날짜.json` 파일이 존재하는지 확인합니다.
3. 기존 Chrome 앱을 **삭제하지 않은 상태**에서 APK 시험판을 설치합니다. 시험판 이름은 `내 고정지출 (APK 시험)`입니다.
4. APK 시험판에서 상단 **⋮** 메뉴 → **JSON 백업 불러오기**로 파일을 선택합니다. 화면에서 복원 확인을 누른 다음 지출 및 수입 수치를 점검합니다.
5. 시험판 데이터가 정상 복구되었는지 확인하기 전에는 Chrome 앱을 삭제하거나 저장소 데이터를 지우지 마세요.

### 데이터 저장
Chrome WebAPK와 Android WebView 앱은 서로 다른 앱 저장소를 사용합니다. 데이터는 자동 이전되지 않습니다. APK는 같은 웹사이트를 표시하지만 WebView의 `localStorage`에 별도 저장합니다.

### 주의 사항
- 웹사이트를 로드하는 온라인 기반 Android 앱이므로 첫 실행에는 네트워크 연결이 필요합니다.
- GitHub Pages의 HTML/JS가 업데이트되면 Android 앱 화면에도 반영될 수 있습니다.
- JavaScript와 WebView 로컬 저장소를 사용하며 외부 웹페이지는 내부 WebView가 아니라 외부 브라우저에서 열도록 설정했습니다.
- 실제 갤럭시에서의 설치·종료·복원 테스트는 아직 필요합니다.

## 수정 파일
- `app/src/main/java/com/gkrqja5317/fixedexpenses/MainActivity.java`
- `app/src/main/AndroidManifest.xml`
- `.github/workflows/build-android-apk.yml` (저장소 루트 기준)
