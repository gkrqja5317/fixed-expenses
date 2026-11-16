#!/usr/bin/env python3
"""Send OneSignal push only after updated version.json is live on GitHub Pages."""
import json, os, sys, time, urllib.request, urllib.error
from pathlib import Path
APP_ID = os.environ.get('ONESIGNAL_APP_ID', '').strip()
SECRET = os.environ.get('ONESIGNAL_REST_API_KEY', '').strip()
SITE = 'https://gkrqja5317.github.io/fixed-expenses/'
if not APP_ID or not SECRET:
    sys.exit('Configure the GitHub Actions secrets ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY first.')
expected = json.loads(Path('version.json').read_text(encoding='utf-8'))
for attempt in range(30):
    try:
        req = urllib.request.Request(SITE+'version.json?check='+str(int(time.time())), headers={'Cache-Control':'no-cache'})
        with urllib.request.urlopen(req, timeout=10) as response:
            deployed=json.load(response)
        if deployed==expected: break
    except (urllib.error.URLError, ValueError, TimeoutError) as exc:
        print('Waiting for Pages:',exc)
    time.sleep(10)
else:
    sys.exit('Pages did not serve new version.json. Push was not sent.')
notes=expected.get('notes') or []
summary = str(notes[0]) if isinstance(notes,list) and notes else '새 기능 및 개선사항을 확인하세요.'
body={
  'app_id':APP_ID,
  'target_channel':'push',
  'included_segments':['Subscribed Users'],
  'headings':{'en':'내 고정지출 업데이트'},
  'contents':{'en':'새 업데이트가 적용되었습니다. '+summary[:90]},
  'url':SITE
}
req=urllib.request.Request(
  'https://api.onesignal.com/notifications',
  data=json.dumps(body,ensure_ascii=False).encode('utf-8'),
  headers={'Authorization':'Key '+SECRET,'Content-Type':'application/json; charset=utf-8'},
  method='POST'
)
try:
    with urllib.request.urlopen(req, timeout=30) as response:
        result=json.load(response)
except urllib.error.HTTPError as error:
    sys.exit('Push failed HTTP %d: %s'%(error.code,error.read().decode('utf-8')[:400]))
if result.get('errors'): sys.exit('Push provider error: '+str(result['errors']))
print('Notification submitted to OneSignal, ID:',result.get('id','unknown'))
