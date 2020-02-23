import * as path from 'path';
import * as exec from '@actions/exec';
import * as core from '@actions/core';


const IS_WINDOWS = process.platform === 'win32';
const IS_DARWIN = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

let tempDirectory = process.env['RUNNER_TEMP'] || '';

if (!tempDirectory) {
  let baseLocation;

  if(IS_WINDOWS){
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  }else if(IS_DARWIN){
    baseLocation = '/Users';
  }else{
    baseLocation = '/home';
  }
  tempDirectory = path.join(baseLocation, 'actions');
}

interface Options { listeners: {} };

export async function setupAndroid(version: string): Promise<void>{
  console.log('=== installing prerequisites ===');
  await exec.exec(`bash -c "sudo chmod -R 777 ${tempDirectory} "`)
  await exec.exec('sudo apt-get update');
  await exec.exec('sudo apt-get install -qqy ca-certificates curl apt-transport-https');
  await exec.exec('sudo apt-get install -qqy unzip python3-cffi lsb-release');
  console.log('=== installing firebase tools ===');  
  await exec.exec(`bash -c "curl -sL https://firebase.tools | bash"` );

  let lsbRelease : string = '';
  const  lsbReleaseObj = {} as Options;
  lsbReleaseObj.listeners = {
    stdout: (data: Buffer) => {
      lsbRelease += data.toString();
    },    
  };

  await exec.exec('lsb_release -c -s',undefined,lsbReleaseObj);
  core.exportVariable('LSB_RELEASE', lsbRelease); 
  core.exportVariable('CLOUD_SDK_REPO', `cloud-sdk-${lsbRelease}`);

  console.log('=== installing gcloud SDK ===');
  await exec.exec('echo "deb https://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list');  
  await exec.exec(`bash -c "curl https://packages.cloud.google.com/apt/doc/apt-key.gpg --output ${tempDirectory}/key.gpg "`);
  await exec.exec(`sudo apt-key add ${tempDirectory}/key.gpg`);
  await exec.exec('bash -c "sudo apt-get update && sudo apt-get install -qqy google-cloud-sdk "');
  await exec.exec(`bash -c "gcloud config set core/disable_usage_reporting true && gcloud config set component_manager/disable_update_check true "`);
  
  core.exportVariable('ANDROID_HOME',`${tempDirectory}/android/sdk`);
  core.exportVariable('SDK_VERSION','sdk-tools-linux-4333796.zip');
  core.exportVariable('ADB_INSTALL_TIMEOUT','120');

  await exec.exec('bash -c "sudo mkdir -p $ANDROID_HOME"');  
  await exec.exec(`bash -c "curl --silent --show-error --location --fail --retry 3 --output ${tempDirectory}/$SDK_VERSION https://dl.google.com/android/repository/$SDK_VERSION"`);
  await exec.exec(`bash -c "sudo unzip -q ${tempDirectory}/$SDK_VERSION -d $ANDROID_HOME && sudo rm -rf ${tempDirectory}/$SDK_VERSION "`);
 
  core.addPath(`${tempDirectory}/android/sdk/emulator`);
  core.addPath(`${tempDirectory}/android/sdk/tools`);
  core.addPath(`${tempDirectory}/android/sdk/tools/bin`);
  core.addPath(`${tempDirectory}/android/sdk/platform-tools`);

  await exec.exec(`bash -c "echo $PATH" `);
  await exec.exec(`bash -c "echo $ANDROID_HOME" `);
  console.log('=== installing android SDK ===');
  // await exec.exec(`bash -c "sudo mkdir ${tempDirectory}/.android && sudo echo '### User Sources for Android SDK Manager' | sudo tee -a ${tempDirectory}/.android/repositories.cfg"`)
  await exec.exec(`bash -c "sdkmanager --list"`);
  // await exec.exec(`bash -c "yes | sudo ${tempDirectory}/android/sdk/tools/bin/sdkmanager --licenses && sudo ${tempDirectory}/android/sdk/tools/bin/sdkmanager --update"`);  
  // await exec.exec(`bash -c "sudo ${tempDirectory}/android/sdk/tools/bin/sdkmanager "tools" "platform-tools" "emulator" "extras;android;m2repository" "extras;google;m2repository" "extras;google;google_play_services" "`);
  // await exec.exec(`bash -c "sudo ${tempDirectory}/android/sdk/tools/bin/sdkmanager "build-tools;${version}.0.0" "`);
  // await exec.exec(`bash -c "sudo ${tempDirectory}/android/sdk/tools/bin/sdkmanager "platforms;android-${version}" "`);  
}