try {
  const response = await fetch('http://se160590.fg.rbc.com:5000/api/run-powershell', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: `(Get-ADUser -Filter {SamAccountName -eq '${loginId}'} -Properties SID -Server "oak.fg.rbc.com").SID.Value`
    }),
  });

  const data = await response.json();
  const sid = data.output.trim();
  console.log('Initializing RSA Check...');
  console.log(`User: ${loginId} SID: ${sid}`);

  if (response.ok && sid) {
    // Construct path for SQLite token info based on the username
    const rsaScript = `
      $user = '${loginId}';
      $userProfile = (Get-CimInstance -ClassName Win32_UserProfile | Where-Object { $_.LocalPath -like "*\\$user" }).LocalPath
      if ($userProfile) {
        $dbPath = "$userProfile\\AppData\\Local\\Packages\\RSASecurityLLC.RSASecurIDAuthenticate_1ze70x1yhyay8\\LocalState\\SecurIDSDK.sqlite";
        powershell.exe -ExecutionPolicy Bypass -File "C:\\Scripts\\Dump-TokenInfo.ps1" -DatabasePath $dbPath
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
    console.log(`RSA Script Output for ${loginId}:\n${tokenOutput}`);

    const tokenFound = tokenOutput.includes("TokenSerial");

    if (tokenFound) {
      console.log(`RSA Token(s) found for user ${loginId}`);
      const status = "TRUE";
      const updateResponse = await fetch(`http://se160590.fg.rbc.com:5000/api/assets/${assetId}/rsadone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (updateResponse.ok) {
        fetchAssets();
      }
    } else {
      console.log(`No RSA Token found for user ${loginId} on asset ${assetName}`);
    }
  } else {
    console.error('Failed to fetch SID or RSA info');
  }
} catch (error) {
  console.error('Error:', error);
}
