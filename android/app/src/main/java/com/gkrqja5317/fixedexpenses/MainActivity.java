package com.gkrqja5317.fixedexpenses;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JsPromptResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONArray;
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
    private boolean quitDialogShown;
    private static final int SYSTEM_BAR_COLOR = 0xff101827;
    private static final String EXIT_PROMPT = "fixed-expenses:exit";
    private static final String EXPORT_PROMPT = "fixed-expenses:export";

    private static boolean isHomePage(String url) {
        return url != null && (HOME.equals(url) || (HOME + "index.html").equals(url));
    }

    private static final String HANDLE_BACK_JS = "(function(){"
        + "const d=document.getElementById('exitConfirm');if(d&&d.open){d.close();return true;}"
        + "const checks=[['v2Picker','v2PickerClose','hidden'],['incomeModal','incomeClose','hidden'],"
        + "['incomeTypeChooser','closeIncomeChooser','hidden'],['overlay','closeBtn','open'],"
        + "['menuDropdown','menuToggle','hidden']];"
        + "for(const [panel,button,cls] of checks){const p=document.getElementById(panel);"
        + "if(p&&(cls==='open'?p.classList.contains(cls):!p.classList.contains(cls))){"
        + "document.getElementById(button)?.click();return true;}}"
        + "const cancel=document.getElementById('exitCancel'),accept=document.getElementById('exitAccept');"
        + "if(!d||!cancel||!accept||typeof d.showModal!=='function')return false;"
        + "cancel.onclick=(e)=>{e.stopImmediatePropagation();d.close();};"
        + "accept.onclick=(e)=>{e.stopImmediatePropagation();d.close();window.prompt('" + EXIT_PROMPT + "');};"
        + "d.showModal();cancel.focus();return true;})()";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(SYSTEM_BAR_COLOR);
        getWindow().setNavigationBarColor(SYSTEM_BAR_COLOR);
        getWindow().getDecorView().setSystemUiVisibility(
            getWindow().getDecorView().getSystemUiVisibility()
                & ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR));
        web = new WebView(this);
        web.setBackgroundColor(SYSTEM_BAR_COLOR);

        FrameLayout content = new FrameLayout(this);
        content.setBackgroundColor(SYSTEM_BAR_COLOR);
        content.addView(web, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        if (Build.VERSION.SDK_INT >= 35) {
            getWindow().setDecorFitsSystemWindows(false);
            getWindow().setNavigationBarContrastEnforced(false);
            content.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets padding = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                    | WindowInsets.Type.ime());
                view.setPadding(padding.left, padding.top, padding.right, padding.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(content);
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
                if (isHomePage(url)) {
                    view.evaluateJavascript("(function(){const button=document.getElementById('exportBtn');"
                        + "if(button)button.onclick=()=>{window.prompt('" + EXPORT_PROMPT + "');};})()", null);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsPrompt(WebView view, String url, String message,
                String defaultValue, JsPromptResult result) {
                if (!isHomePage(url) || !isHomePage(view.getUrl())) return false;
                switch (message) {
                    case EXIT_PROMPT:
                        result.confirm();
                        finishAndRemoveTask();
                        return true;
                    case EXPORT_PROMPT:
                        result.confirm();
                        exportBackup();
                        return true;
                    default:
                        return false;
                }
            }

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
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        Uri uri=result==RESULT_OK&&data!=null?data.getData():null;
        if(request==CHOOSE_IMPORT){
            if(webFileCallback!=null){
                webFileCallback.onReceiveValue(uri==null?null:new Uri[]{uri});
                webFileCallback=null;
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
