package com.gkrqja5317.fixedexpenses;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONArray;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String HOME = "https://gkrqja5317.github.io/fixed-expenses/";
    private static final String HOST = "gkrqja5317.github.io";
    private static final String ROOT_PATH = "/fixed-expenses/";
    private static final int CHOOSE_IMPORT = 71;
    private static final int SAVE_BACKUP = 72;
    private WebView web;
    private ValueCallback<Uri[]> webFileCallback;
    private String pendingBackup;
    private boolean quitDialogShown = false;

    private static final String HANDLE_BACK_JS = "(function(){"
        + "const d=document.getElementById('exitConfirm');if(d&&d.open){d.close();return true;}"
        + "const checks=[['v2Picker','v2PickerClose','hidden'],['incomeModal','incomeClose','hidden'],"
        + "['incomeTypeChooser','closeIncomeChooser','hidden'],['overlay','closeBtn','open'],"
        + "['menuDropdown','menuToggle','hidden']];"
        + "for(const [panel,button,cls] of checks){const p=document.getElementById(panel);"
        + "if(p&&(cls==='open'?p.classList.contains(cls):!p.classList.contains(cls))){"
        + "document.getElementById(button)?.click();return true;}}return false;})()";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff101827);
        getWindow().setNavigationBarColor(0xff101827);
        web = new WebView(this);
        web.setBackgroundColor(0xff101827);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            private boolean trusted(Uri uri) {
                return "https".equalsIgnoreCase(uri.getScheme())
                    && HOST.equalsIgnoreCase(uri.getHost())
                    && uri.getPath() != null && uri.getPath().startsWith(ROOT_PATH);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if(trusted(request.getUrl()))return false;
                // Do not load external sites within the privileged expense-data WebView.
                try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); }
                catch(Exception ignored) { Toast.makeText(MainActivity.this,"외부 링크를 열 수 없습니다.",Toast.LENGTH_SHORT).show(); }
                return true;
            }
            @Override public void onPageFinished(WebView view,String url) {
                if(url.startsWith(HOME))invalidateOptionsMenu();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(webFileCallback!=null)webFileCallback.onReceiveValue(null);
                webFileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                try {startActivityForResult(intent,CHOOSE_IMPORT);}
                catch(ActivityNotFoundException e){webFileCallback=null;callback.onReceiveValue(null);return false;}
                return true;
            }
        });
        if(state==null)web.loadUrl(HOME);
        else web.restoreState(state);
    }

    @Override public void onBackPressed() {
        if(quitDialogShown)return;
        web.evaluateJavascript(HANDLE_BACK_JS, result -> {
            if(!"true".equals(result))showExit();
        });
    }
    private void showExit(){
        if(quitDialogShown || isFinishing() || isDestroyed())return;
        quitDialogShown=true;
        AlertDialog dialog=new AlertDialog.Builder(this)
            .setTitle("앱 종료")
            .setMessage("앱을 종료하시겠습니까?")
            .setNegativeButton("취소",(d,w)->d.dismiss())
            .setPositiveButton("확인",(d,w)->finishAndRemoveTask())
            .create();
        dialog.setOnDismissListener(d->quitDialogShown=false);
        // The system Back key dismisses this dialog, exactly like Cancel.
        dialog.setCanceledOnTouchOutside(true);
        dialog.show();
    }

    @Override public boolean onCreateOptionsMenu(Menu menu){
        menu.add(0,1,0,"JSON 백업 저장");
        menu.add(0,2,1,"JSON 백업 불러오기");
        return true;
    }
    @Override public boolean onOptionsItemSelected(MenuItem item){
        if(item.getItemId()==1){exportBackup();return true;}
        if(item.getItemId()==2){openImport();return true;}
        return super.onOptionsItemSelected(item);
    }
    private void exportBackup(){
        String script="(function(){try{const expenses=JSON.parse(localStorage.getItem('fixedExpenseApp_v1')||'[]');"
            +"const income=localStorage.getItem('fixedExpenseIncome_v1');"
            +"const b={app:'fixed-expenses',version:1,exportedAt:new Date().toISOString(),expenses};"
            +"if(income)b.incomeData=JSON.parse(income);return JSON.stringify(b);}catch(e){return null;}})()";
        web.evaluateJavascript(script, value -> {
            try{
                if("null".equals(value))throw new Exception("empty backup");
                pendingBackup=new JSONArray("["+value+"]").getString(0);
                Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE,"고정지출_APK_백업.json");
                startActivityForResult(i,SAVE_BACKUP);
            }catch(Exception e){Toast.makeText(this,"백업 생성에 실패했습니다.",Toast.LENGTH_LONG).show();}
        });
    }
    private void openImport(){
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/json");
        startActivityForResult(i,CHOOSE_IMPORT);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        Uri uri=result==RESULT_OK&&data!=null?data.getData():null;
        if(request==CHOOSE_IMPORT){
            if(webFileCallback!=null){
                webFileCallback.onReceiveValue(uri==null?null:new Uri[]{uri});
                webFileCallback=null;
            }else if(uri!=null){
                // Reuse the existing PWA JSON validation and confirmation dialog.
                try(InputStream in=getContentResolver().openInputStream(uri)){
                    if(in==null)throw new Exception("missing file");
                    byte[] bytes=in.readNBytes(5_000_001);
                    if(bytes.length>5_000_000)throw new Exception("file too large");
                    String json=new String(bytes,StandardCharsets.UTF_8);
                    new org.json.JSONObject(json); // Reject non-JSON before passing to the web app.
                    String escaped=org.json.JSONObject.quote(json);
                    String js="(function(){const input=document.getElementById('importFile');"
                        +"if(!input)return false;const file=new File(["+escaped+"],'backup.json',{type:'application/json'});"
                        +"const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;"
                        +"input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()";
                    web.evaluateJavascript(js,resultText->{if(!"true".equals(resultText))Toast.makeText(this,"불러오기를 시작하지 못했습니다.",Toast.LENGTH_LONG).show();});
                }catch(Exception e){Toast.makeText(this,"올바른 JSON 백업 파일을 선택하세요.",Toast.LENGTH_LONG).show();}
            }
        }else if(request==SAVE_BACKUP&&uri!=null&&pendingBackup!=null){
            try(OutputStream out=getContentResolver().openOutputStream(uri)){
                if(out==null)throw new Exception("missing output");
                out.write(pendingBackup.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this,"백업 저장 완료",Toast.LENGTH_SHORT).show();
            }catch(Exception e){Toast.makeText(this,"백업 저장에 실패했습니다.",Toast.LENGTH_LONG).show();}
            finally{pendingBackup=null;}
        }
    }
    @Override protected void onSaveInstanceState(Bundle state){web.saveState(state);super.onSaveInstanceState(state);}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
