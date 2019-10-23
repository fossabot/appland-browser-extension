const statusElement = document.querySelector('.status');
const recordButton = document.querySelector('#appmap-record');
const urlInput = document.querySelector("#appland-url");
const browser = (window.chrome || window.browser);

let ellipsisTimeoutId = -1;

function saveApplandUrl(url) {
  browser.storage.local.set({applandUrl: url});
}

function getTabUrl(callback) {
  browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const url = new URL(tabs[0].url);
    callback(url);
  });
}

function getAppLandUrl() {
  return urlInput.value;
}

function startRecording() {
  getTabUrl((url) => {
    const req = new XMLHttpRequest();
    req.open('POST', `${url.origin}/_appmap/record`);
    req.send();
    displayRecording(true);
  });
}

function stopRecording() {
  getTabUrl((url) => {
    const req = new XMLHttpRequest();
    req.open('DELETE', `${url.origin}/_appmap/record`);
    req.send();
    req.onload = () => {
      if (req.status === 200) {
        if ( req.response ) {
          saveScenario(JSON.parse(req.response));
        }
      }
    };
    displayRecording(false);
  });
}

function setStatus(status) {
  statusElement.innerHTML = status;
}

function saveScenario(data) {
  const url = getAppLandUrl();
  const req = new XMLHttpRequest();
  req.open('POST', `${url}/api/scenarios`);
  req.setRequestHeader('Content-Type', 'application/json');
  req.send(JSON.stringify({data: data}));
  req.onload = () => {
    if (req.status === 201) {
      const response = JSON.parse(req.response);
      const name = response.uuid.substring(0,8);
      setStatus(`successfully uploaded <a href="${url}/scenarios/${response.uuid}" target="_blank">${name}</a>`);
    } else {
      setStatus('failed to upload scenario');
    }
  };
}

function animateEllipsis(isAnimating, numEllipsis) {
  if (!isAnimating) {
    if (ellipsisTimeoutId >= 0) {
      clearTimeout(ellipsisTimeoutId);
      ellipsisTimeoutId = -1;
    }
    return;
  }

  ellipsisTimeoutId = setTimeout(() => {
    let n = numEllipsis;
    if (!n || n > 3) {
      n = 0;
    }
    
    let text = statusElement.innerText.replace(/\./g, '');
    for (let i = 0; i < n; ++i) {
      text += '.';
    }

    statusElement.innerText = text;

    animateEllipsis(true, n + 1);
  }, 250);
}

function displayRecording(isRecording) {
  recordButton.checked = isRecording;
  statusElement.innerText = isRecording ? 'recording' : 'ready';
  animateEllipsis(isRecording);
}

recordButton.addEventListener('change', (e) => {
  e.target.checked ? startRecording() : stopRecording()
});

urlInput.addEventListener('change', (e) => {
  saveApplandUrl(e.target.value);
});

function onLoad() {
  browser.storage.local.get('applandUrl', (data) => {
    if (data.applandUrl) {
      urlInput.value = data.applandUrl;
    }
  });

  getTabUrl((url) => {
    const req = new XMLHttpRequest();
    req.open('GET', `${url.origin}/_appmap/record`);
    req.send();
    req.onload = () => {
      if (req.status === 200) {
        const recordingState = JSON.parse(req.response);
        displayRecording(recordingState.enabled);
      } else {
        setStatus('not available for this domain');
      }
    };
  });
}

document.addEventListener('DOMContentLoaded', onLoad, false);