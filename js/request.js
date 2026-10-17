document.addEventListener('DOMContentLoaded', function(){
  const form=document.getElementById('requestForm');
  const status=document.getElementById('requestStatus');
  const output=document.getElementById('requestOutput');
  const copyButton=document.getElementById('copyRequest');
  if(!form || !status || !output || !copyButton) return;

  form.addEventListener('submit', function(event){
    event.preventDefault();
    if(!form.reportValidity()) return;
    const values=new FormData(form);
    const lines=['Job search request','',`Request type: ${values.get('requestType')||'Not specified'}`,`Career family: ${values.get('careerFamily')||'Not specified'}`,`Role: ${values.get('role')||'Not specified'}`,`City: ${values.get('city')||'Not specified'}`,`State: ${values.get('state')||'Not specified'}`,`Company: ${values.get('company')||'Not specified'}`,`Job type: ${values.get('jobType')||'Not specified'}`,`Work mode: ${values.get('workMode')||'Not specified'}`,`Experience: ${values.get('experience')||'Not specified'}`,`Career page URL: ${values.get('url')||'Not specified'}`,'',`Details: ${values.get('details')||'Not specified'}`];
    output.value=lines.join('\n');
    output.hidden=false;
    copyButton.hidden=false;
    status.textContent='Request summary created. Copy it and share it through your preferred channel.';
  });

  form.addEventListener('reset', function(){
    output.value='';
    output.hidden=true;
    copyButton.hidden=true;
    status.textContent='';
  });

  copyButton.addEventListener('click', async function(){
    try{
      await navigator.clipboard.writeText(output.value);
      status.textContent='Request summary copied to the clipboard.';
    }catch(error){
      output.focus();
      output.select();
      status.textContent='Copy was blocked by the browser. Select the prepared text and copy it manually.';
    }
  });
});
