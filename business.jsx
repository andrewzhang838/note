// BUSINESS BUNDLE CHECK
const requiredAppMap = {
  "BCS - Operations": ["ADC3", "ADC4"],
  "GM - Research": ["XXU4", "TB81", "FEJ1", "XGW1", "TB82", "VXN2", "SEW0"],
  "GM - S&T": ["MDM1", "ZPGS", "UVDC", "XXU4", "TB81", "FEJ1"],
  "GM - Origination": ["MDM1", "ZPGS", "UVDC", "ZNK1", "TB81", "TB82"],
  "GM - CFG": ["MDM1", "FEJ1", "ZPGS", "ZPG1", "ZPGA", "ZPGR", "ZMW0", "U951", "PTY1", "MH8F", "WPq14", "MH052", "ZNK1", "XTC1"],
  "GM - Quant Trading Program": ["MDM1", "FEJ1", "ZPGS", "ZPG1", "ZPGA", "ZPGR", "ZMW0", "U951", "PTY1", "MH8F", "WPq14", "MH052", "ZNK1", "XTC1"],
  "Cash Management": ["FEJ1", "TF51"],
  "CB": ["XXU4", "UVDC", "YWP2", "YWP0", "YRC0", "DE04", "SDQ3"],
  "GIB": ["XXU4", "UVDC", "TB81", "FEJ1", "TB82", "VMI5", "SEW0"],
  "GRM": ["FEJ1", "YWP2", "YWP0", "UVDC"],
  "Internal Audit": ["FEJ1", "TF51"],
  "MF": ["VZE4", "MI01P", "XXU4", "UVDC", "MDM1", "ZJU2", "VZE6", "TB81", "TB82"],
  "MF - Community Investments": ["VZE4", "MI01P", "XXU4", "UVDC", "MDM1", "ZJU2", "VZE6", "TB81", "TB82"],
  "RECP": ["FEJ1", "TF51"]
};

try {
  const response = await fetch('http://se160590.fg.rbc.com:5000/api/run-powershell', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      script: `Invoke-Command -ComputerName ${assetName} -ScriptBlock {
        Get-ItemProperty 'HKLM:\\Software\\Application_Installs\\*' |
        Where-Object { $_.APPLICATION_NAME -and $_.install_status -eq 'SUCCESS' } |
        Select-Object -ExpandProperty PSChildName
      }`
    }),
  });
  
  const data = await response.json();
  const installedApps = data.output.trim().split('\n').map(code => code.replace('\r', ''));
  
  // Find required apps for this business group
  const requiredApps = Object.entries(requiredAppMap).find(([key]) =>
    businessGroup.includes(key)
  )?.[1] || [];

  if (!requiredApps.length) {
    console.log(`No required apps configured for ${businessGroup}`);
  } else {
    const bundlesCheck = requiredApps.every(app => installedApps.includes(app));
    status = "TRUE";

    if (bundlesCheck) {
      console.log(`Business Bundle verified for ${businessGroup}.`);

      const updateResponse = await fetch(`http://se160590.fg.rbc.com:5000/api/assets/${assetId}/bscbundle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (updateResponse.ok) {
        fetchAssets();
      } else {
        const error = await updateResponse.json();
        console.error(error);
      }
    } else {
      console.log(`Business Bundle verification failed for ${businessGroup}. Missing required apps.`);
    }
  }
} catch (error) {
  console.error(error);
}
