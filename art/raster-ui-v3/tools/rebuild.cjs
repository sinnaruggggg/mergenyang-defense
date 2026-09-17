const {execFileSync}=require('child_process'),path=require('path');
process.env.TEMP='D:/CodexData/temp';process.env.TMP=process.env.TEMP;
for(const script of ['build-raster-ui.cjs','align-ui.cjs','validate-and-package.cjs','verify-browser.cjs'])execFileSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit',env:process.env});
