// RSA CHECK
try {
  const rsaScript = `
    $user = '${loginId}';
    $userProfile = (Get-CimInstance -ClassName Win32_UserProfile | Where-Object { $_.LocalPath -like "*\\$user" }).LocalPath
    if ($userProfile) {
      $dbPath = "$userProfile\\AppData\\Local\\Packages\\RSASecurityLLC.RSASecurIDAuthenticate_1ze70x1yhyay8\\LocalState\\SecurIDSDK.sqlite";
      $sqlitePath = "C:\\Scripts\\sqlite3.exe"; # Ensure this path is valid
      $tableName = "TokenMetadataSet";
      $sqlQuery = "SELECT TokenSerial, ExpirationDate FROM $tableName;";
      $result = & $sqlitePath -batch -noheader -cmd ".mode tabs" $dbPath $sqlQuery;

      $rows = @("TokenSerial`tExpirationDate") + ($result -split "\\r?\\n" | Where-Object { $_ -ne "" });
      $headers = $rows[0] -split "\\t";
      $dataLines = $rows[1..($rows.Count - 1)];
      $dataObjects = $dataLines | ForEach-Object {
        $values = $_ -split "\\t";
        $obj = [PSCustomObject]@{}
        for ($i = 0; $i -lt $headers.Length; $i++) {
            $name = $headers[$i].Trim();
            $value = $values[$i];
            if ($name -eq "ExpirationDate" -and $value -match '^[0-9]{13}$') {
                $epoch = [datetime]"1970-01-01T00:00:00Z";
                $value = $epoch.AddMilliseconds([double]$value).ToString("yyyy-MM-dd HH:mm:ss 'UTC'");
            }
            $obj | Add-Member -MemberType NoteProperty -Name $name -Value $value -Force
        }
        $obj
      };
      $dataObjects | Format-Table -AutoSize
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
      script: `Invoke-Command -ComputerName ${assetName} -ScriptBlock { ${rsaScript} }`,
    }),
  });

  const rsaData = await rsaResponse.json();
  const defaultToken = rsaData.output.trim();
  if(defaultToken){
    console.log(`RSA Token for user ${loginId} is ${defaultToken}`);
  }else{
    console.log(`No RSA Token found for user ${loginId} on asset ${assetName}`);
  }

  // If DefaultToken is not null, mark RSA as true
  if (defaultToken) {
    status = "TRUE";
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
  }
} else {
  console.error('Failed to fetch SID or RSA info');
}
} catch (error) {
  console.error('Error:', error);
}