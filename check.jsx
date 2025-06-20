try {
  const rsaScript = `
    $user = '${loginId}';
    $userProfile = (Get-CimInstance -ClassName Win32_UserProfile | Where-Object { $_.LocalPath -like "*\\$user" }).LocalPath
    if ($userProfile) {
      $dbPath = "$userProfile\\AppData\\Local\\Packages\\RSASecurityLLC.RSASecurIDAuthenticate_1ze70x1yhyay8\\LocalState\\SecurIDSDK.sqlite";
      powershell -ExecutionPolicy Bypass -File "C:\\Scripts\\Dump-TokenInfo.ps1" -DatabasePath $dbPath
    } else {
      Write-Output "User profile not found for ${loginId}"
    }
  `;
  
  const rsaResponse = await fetch('http://se160590.fg.rbc.com:5000/api/run-rsacheck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      script: `Invoke-Command -ComputerName ${assetName} -ScriptBlock { ${rsaScript} }`
    }),
  });
  
  const rsaData = await rsaResponse.json();
  const tokenOutput = rsaData.output.trim();
  console.log(`RSA Output for ${loginId}:\n${tokenOutput}`);

  if (tokenOutput.includes("TokenSerial")) {
    status = "TRUE";
    const updateResponse = await fetch(`http://se160590.fg.rbc.com:5000/api/assets/${assetId}/rsadone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (updateResponse.ok) {
      fetchAssets();
    }
  } else {
    console.log(`No RSA Token found for user ${loginId} on ${assetName}`);
  }
} catch (error) {
  console.error('Error checking RSA Token:', error);
}
