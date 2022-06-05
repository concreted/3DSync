$(function(){
    const clientId = 'z4n5nrlgoypivuw';
    let params = new URLSearchParams(window.location.search);
    let code = params.get('code');
    let paths = [];

    let stepperInstace = new MStepper(document.querySelector('.stepper'), {
        firstActive: 0,
        autoFormCreation: false,
        stepTitleNavigation: false,
    });

    if(code !== null){
        var formdata = new FormData();
        formdata.append("code", code);
        formdata.append("grant_type", "authorization_code");
        formdata.append("code_verifier", localStorage.getItem('code_challenge'));
        formdata.append("client_id", clientId);
        formdata.append("redirect_uri", "https://concreted.github.io/3DSync/");

        var requestOptions = {
            method: 'POST',
            body: formdata,
            redirect: 'follow'
        };

        fetch("https://api.dropbox.com/oauth2/token", requestOptions)
            .then(response => JSON.parse(response.text()))
            .then(function(result) {
                console.log(result);
                localStorage.setItem('refresh_token', result['refresh_token']);
                stepperInstace.nextStep();
            })
            .catch(error => console.log('error', error));
    }

    $('#dropbox-login').on('click', function(e){
        e.preventDefault();
        let codeChallenge = [...Array(100)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
        localStorage.setItem('code_challenge', codeChallenge);
        window.location.href = "https://www.dropbox.com/oauth2/authorize?client_id=" + clientId + "&response_type=code&token_access_type=offline&code_challenge=" + codeChallenge + "&code_challenge_method=plain&redirect_uri=https://concreted.github.io/3DSync/";
    });

    function getConfigString(){
        let strPaths = '';
        paths.forEach(function(path){
            strPaths += path[0] + '=' + path[1] + '\n';
        });
        return '[Dropbox]\nRefreshToken=' + localStorage.getItem('refresh_token') + '\n' + '[Paths]\n' + strPaths;
    }

    $('#download-config').on('click', function(e){
        e.preventDefault();
        let blob = new Blob([getConfigString()], {type: "application/octet-stream;charset=utf-8"});
        const fileStream = streamSaver.createWriteStream('3DSync.ini', {
            size: blob.size
        });
        const readableStream = blob.stream();
        if (window.WritableStream && readableStream.pipeTo) {
            return readableStream.pipeTo(fileStream)
              .then(() => console.log('done writing'));
        }
        window.writer = fileStream.getWriter();
        const reader = readableStream.getReader();
        const pump = () => reader.read()
          .then(res => res.done
            ? writer.close()
            : writer.write(res.value).then(pump));
        pump();
    });

    $('#add-custom-path').on('click', function(e){
        e.preventDefault();
        let id = Date.now();
        let $input = $('<div class="row">' +
          '<div class="input-field col s3"><input id="' + id + '-n" class="white-text" type="text"><label for="' + id + '-n" class="white-text">Name</label><span class="helper-text" data-error="Invalid name"></span></div>' +
          '<div class="input-field col s7"><input id="' + id + '" class="white-text path-custom" type="text"><label for="' + id + '" class="white-text">Path</label><span class="helper-text" data-error="Invalid path"></span></div>' +
          '<div class="col s2"><a href="#" class="btn-floating waves-effect waves-light red remove-custom-path"><i class="material-icons">remove</i></a></div></div>');
        $input.find('.remove-custom-path').on('click', function(e){
            e.preventDefault();
            $(this).parent().parent().remove();
        });
        $(this).before($input);
    });

    const pathRegex = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

    function pathParse(path){
        let parts = pathRegex.exec(path).slice(1);
        if (!parts || parts.length !== 4) {
            return false;
        }
        parts[1] = parts[1] || '';
        parts[2] = parts[2] || '';
        parts[3] = parts[3] || '';

        return {
            root: parts[0],
            dir: parts[0] + parts[1].slice(0, -1),
            base: parts[2],
            ext: parts[3],
            name: parts[2].slice(0, parts[2].length - parts[3].length)
        };
    }


    $('#folders-confirm').on('click', function(e){
        e.preventDefault();
        paths = [];
        let error = false;
        $('#paths-presets input:checked, #paths-custom input.path-custom').each(function(){
            let $this = $(this);
            if($this.hasClass('path-custom')){
                let path = $this.val();
                let pathCheck = pathParse(path);
                if(pathCheck === false){
                    error = true;
                    $this.addClass('invalid');
                } else {
                    let pathSync = '';
                    if(pathCheck['ext'] === ''){
                        pathSync += pathCheck['dir'];
                        if(pathCheck['dir'] !== '/'){
                            pathSync += '/';
                        }
                        pathSync += pathCheck['base'];
                    } else {
                        if(pathCheck['dir'] === ''){
                            error = true;
                        }
                        pathSync += pathCheck['dir'];
                    }
                    if(pathSync.startsWith('/') === false) pathSync = '/' + pathSync;
                    if(error === false){
                        $this.removeClass('invalid');
                        let $name = $('#' + $this.attr('id') + '-n');
                        if ($name.val() === '') {
                            error = true;
                            $name.addClass('invalid');
                        } else {
                            $name.removeClass('invalid');
                            paths.push([$name.val(), pathSync]);
                        }
                    }
                }
            } else {
                paths.push([$this.next().text(), $this.data('path')]);
            }
        });
        if(error === false){
            stepperInstace.nextStep();
        }
    });
});
