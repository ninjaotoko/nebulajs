////////////////////////////////////////////////////////////////////////////////
//
// Nebula JS
// 
// Primer implementación limpia y seria de nebulajs
// Copyright 2012, Xavier Lesa
// 
// Xavier Lesa <xavierlesa@gmail.com>
// 
// Sun Apr 29 18:39:26 ART 2012
//
//
// Notas:
// Requiere de jQuery y Underscore para usar todas las funciones, en caso de que
// no estén cargadas éstas librerías las intenta cargar automáticamente con 
// asyncload desde CDN.
// 
////////////////////////////////////////////////////////////////////////////////
(function ( window, undefined ) {

    // Setea el objeto NebulaJS para que nadie mas lo use :)
    var NebulaJS = {}
    , document = window.document
    , navigator = window.navigator
    , location = window.location;
    
    (function () {
        var queuelist = {};

        // Utilidades (Obsoleto, esto va a ser reemplazado por underscore)
        var utils = {
            toType : function ( object ) { 
                return ({}).toString.call( object ).match( /\s([a-zA-Z]+)/ )[1].toLowerCase()
            }
            , isArray : function ( object ) {
                return Array.isArray( object )
            }
            , isObject : function ( object ) {
                return object === Object( object ) && !Array.isArray( object )
            }
            , keys : function ( object ) {
                return Object.keys( object ) 
            }
            , trim : function ( str ) {
                return str.replace( /^\s+|\s+$/g, "" )
            }
            , extend : function ( from, element ) {
                var k, element = element || this;
                for ( k in from ) element[k] = from[k];
                return element
            }
            , args : function ( args ) {
                return Array.prototype.slice.call( args, 1 )
            } 
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Controlador de URLs y vistas, es la C de MVC
        // como usar:
        //
        // var control = $n.watchHash(/* config */)
        //
        // control.action({
        //      'url': callback,
        //      '^url_regexp/(\d+)/': callback 
        //          // devuelve el callback pasando como args los valores capturados
        //      })
        //
        // control.start() // inicia el controlador
        // 
        //
        ////////////////////////////////////////////////////////////////////////////////
        , watchHash = function ( settings, callback ) {
            var callback = utils.toType( callback ) == "function" ? callback : utils.toType( settings ) == "function" ? settings : function () {}
            , config = utils.extend( utils.isObject( settings ) ? settings : {}, {
                interval: 100,
                hashstring: "#!/",
                endslash: true,
                debug: false
            })
            , hash
            , current = ""
            , action = ""
            , def = false
            , queue = {}
            , i;

            // corrige las RegExp
            function regexp_sanitize( regex ) {
                regex = utils.trim( regex );
                regex = config.endslash && !/\/?\$?$/.test( regex ) ? regex + "/" : regex;
                return regex
            }
            // wrapper para el callback
            function wp_callback( hash, action ) {
                return callback( hash, action )
            }
            // wrapper para las acciones
            function wp_action( fn ) {
                var k;
                if ( utils.isObject( fn ) && utils.toType( fn ) !== 'function' ) {
                    for ( k in fn ) { 
                        Queue.setQueue( regexp_sanitize( k ), fn[k], queue )
                    }
                }
                else {
                    Queue.setQueue( "default", fn, queue )
                }
            }
            // llama a la cola de fn
            function call_queue( actions, hash, action ) {
                var k,i,m;
                if ( !utils.isArray( actions ) ) { actions = [ actions ] }
                for ( k in Queue.getQueue( queue ) ) {
                    for ( i = 0; i < actions.length; i++ ) {
                        if ( m = ( new RegExp( k ) ).exec( actions[ i ] ) ) {
                            m.slice( 1 ).unshift(  actions[ i ] );
                            Queue.callQueue( k, m, queue )
                        }
                    }
                }
                /* log console.log( queue ) */
            }
            // watcher
            function wh() {
                // aplica el nuevo hash
                // resetea la URL y agrega el hash
                hash = window.location.hash;
                if ( !hash ) { 
                    window.location.hash = config.hashstring
                }

                // es un nuevo hash o sea el hash cambió
                if ( hash.length && hash.split( config.hashstring )[1] && current !== hash ) {

                    // guarda la acción para el mapeo
                    action = hash.split( config.hashstring )[1]; 
                    current = hash; // guarda el hash actual
                    // ejecula la cola de fn para este action, y la global
                    call_queue( ["default", action], hash, action )
                    def = false;

                    // llama al callback
                    return wp_callback( hash, action );

                } else if ( hash.length && current !== hash && !def ) {
                    // ejecula la cola de fn para ésta acción y luego la global
                    call_queue( ["default", "home"], hash, action )
                    def = true;

                    // llama al callback
                    return wp_callback( hash, "home" );
                }
            } 
            return {
                action : function ( fn ) {
                    wp_action( fn );
                    return this 
                }
                , start : function () {
                    i = setInterval( wh, config.interval );
                    return this
                }
                , stop : function () {
                    clearInterval( i );
                    return this 
                }
                , restart : function () {
                    clearInterval( i );
                    i = setInterval( wh, config.interval );
                    return this 
                }
            }
        }

        // Queue para aplicar fn en cola
        var Queue = (function () { 
            var setQueue = function ( names, fn, queue ) {
                if ( !$n.utils.isArray( names ) ) { names = [ names ] }
                if ( !$n.utils.isObject( queue ) ) { queue = Queue.queuelist }
                for ( var name = 0; name <= names.length - 1; name++ ) {
                    if ( !queue[names[name]] ) { queue[names[name]] = {} }
                    if ( $n.utils.toType( fn ) == 'function' ) {
                        queue[names[name]][fn.name || ( Math.random() ).toString().replace( "0.", names[name]+"-fn-" )] = fn;
                    }
                }
                return queue[name];
            }
            , getQueue = function ( name, queue ) {
                // resuelve si hay queue activa.
                if ( !$n.utils.isObject( queue ) ) {
                    if ( !$n.utils.isObject( name ) ) { queue = Queue.queuelist }
                    else { queue = name }
                }
                if ( !$n.utils.isArray( name ) && $n.utils.toType( name ) == 'srting') {
                    return queue[ name ]
                }

                return queue;
            }
            , callQueue = function ( names, args, queue ) {
                var name, q;
                if ( !$n.utils.isArray( names ) ) { names = [ names ] }
                if ( !$n.utils.isObject( queue ) ) { 
                    queue = Queue.queuelist
                }
                for ( name = 0; name <= names.length - 1; name++ ) {
                    for ( q in queue[names[name]] ) { queue[names[name]][q].apply( this, args ) }
                }
            };
            return {
                queuelist : {},
                getQueue: getQueue,
                setQueue : setQueue,
                callQueue : callQueue
            }
        })();

        // UI es una mini librería para el manejo de templates
        var ui = (function () {
            var sorter = function ( a,b ) {
                if ( a.toLowerCase() < b.toLowerCase() ) return -1;
                if ( a.toLowerCase() > b.toLowerCase() ) return 1;
                return 0;
            }
            , resolveAttr = function ( attr ) {
                var args=[],k;
                for ( k in attr ) {
                    args.push( k + "=\"" + ( $n.utils.toType( attr[k] ) == "object" ? resolveAttr( attr[k] ) : attr[k] ) + "\"" );
                }
                return args.join( " " )
            }
            , createTag = function ( tag, value, attr ) {
                // tag = strong
                // attr = class, id, etc
                // value = Esto es STRONG
                // result = <strong (args...)>value</strong>

                attr = $n.utils.toType( value ) == "object" ? value : attr;
                attr = resolveAttr( attr );

                value = $n.utils.toType( value ) == "object" ? "" : value || "";

                if ( !tag&&!attr ) throw "createTag necesita de al menos 2 argumentos";
                var norequired_end = /^img|hr|br|link$/i
                , stag = $n.utils.trim( tag )
                , st = "<"
                , st_end = norequired_end.test( stag ) ? "" : ">"
                , et = norequired_end.test( stag ) ? "" : "</"
                , et_end = norequired_end.test( stag ) ? "/>" : ">"
                , dt = attr ? " " : ""
                , etag = norequired_end.test( stag ) ? "" : stag;

                val = norequired_end.test( stag ) ? "" : value;

                return [st,stag,dt,attr,st_end,val,et,etag,et_end];

            }
            , list = function ( object, type, sort, reverse ) {
                type = type || "li";
                sort = sort || false;
                reverse = reverse || false;

                object = ( $n.utils.toType( object ) == "array" ) ? object : ( $n.utils.toType( object ) == "object" ) ? $n.utils.keys( object ) : [];
                object = sort ? object.sort( sorter ) : object;
                object = reverse ? object.reverse(  ) : object;

                var i,t="";
                for ( i=0; i<object.length; i++ ) {
                    t+=createTag( type, object[i] ).join( "" );
                }
                return t;
            }

            return {
                createTag:createTag
                , list: list 
                , olist: function ( object, sort, reverse ) { return list( object, "li", sort, reverse ) }
            }
        }());

        this.utils = utils;
        this.watchHash = watchHash;
        this.Queue = Queue;
        this.ui = ui;

    }).apply( NebulaJS );
    
    window.$n = window.NebulaJS = NebulaJS;

})( window );



////////////////////////////////////////////////////////////////////////////////
// Utilidades
////////////////////////////////////////////////////////////////////////////////
var asyncload = function ( url_scripts ) {
    var i = 0, s, t = document.getElementsByTagName( 'script' )[0];
    if( !$n.utils.isArray( url_scripts ) ) { url_scripts = [ url_scripts ] }
    for ( i = 0; i < url_scripts.length; i++ ) {
        s = document.createElement( 'script' );
        s.src = url_scripts[i];
        s.type = "text/javascript";
        s.async = true;
        t.parentNode.insertBefore( s, t );
    }
}

////////////////////////////////////////////////////////////////////////////////
// Utils pata Notify
////////////////////////////////////////////////////////////////////////////////
// ESTA FUNCION QUEDA FUERA DE USO Y ES REEMPLAZADA CON EL MODULO notify_request
function evaluate_request(request) {
    var SUCCESS = 'success',
        INFO = 'info',
        WARNING = 'warning',
        ERROR = 'error';

    if (request.status == 500) { // error 500
        Notify.error('Error ;(', 'Algo ha fallado, intenta nuevamente!', 3500);
    }
    if (request.status == 404) { // error 404
        Notify.warning('Cuidado :(', 'Al parecer eso no hace nada ¿?', 3500);
    }
    if (request.status == 304) { // info 304
        Notify.info('Cargando :)', 'cargando bytes...', 3500);
        return true;
    }
    if (request.status == 200) { // 200 ok

        // evalua data para encontrar 'error'
        request.done(function(data) {
            var e,typ,ti,co;
            if (data['error'] || (data.length > 1 && data[0]['error'])) {
                e = data['error'] || data[0]['error'];
                //fail o error ?
                if (e['fail_type']) {
                    typ = e['fail_type']; ti = e['fail_msg']; co = '';
                } 
                else if (e['error_msg'] || e['msg'] || e['error']) {
                    typ = 'error'; ti = e['error_msg'] || e['msg'] || e['error']; co = '';

                } else if (e['content'] || e['title']) {
                    typ = 'error'; ti = e['title'] || e['content']; co = e['content'] || '';
                }

                Notify.render(typ, ti, co, 5000);
                return false;
            }
            // evalua los datos para "meta" de la API
            else if ( data.meta && data.response && data.meta.status_type != SUCCESS ) {
                typ = data.meta.status_type;
                ti = data.meta.message;

                Notify.render(typ, ti, co, 5000);
                return false;
            }
        });

        return true;
    }
    
    return false;
}
////////////////////////////////////////////////////////////////////////////////
// Nueva aplicación para evaluar el request y notificar.
// Compatible con Meta y Request de la API
////////////////////////////////////////////////////////////////////////////////
var notify_request = (function(){

    var m = this,
        config = {
            delay_fail: 4000,
            delay_info: 5000,
            delay_success: 3500
        },
        SUCCESS = 'success',
        INFO = 'info',
        WARNING = 'warning',
        ERROR = 'error',
    
    evaluate = function ( request ) {
        // ERROR 500
        if (request.status == 500) {
            Notify.error('Error ;(', 'Algo ha fallado, intenta nuevamente!', config.delay_fail);
        }
        // ERROR 404
        if (request.status == 404) {
            Notify.warning('Cuidado :(', 'Al parecer eso no hace nada ¿?', config.delay_fail);
        }
        // INFO 304
        if (request.status == 304) {
            Notify.info('Cargando :)', 'cargando bytes...', config.delay_info);
            return true;
        }
        // 200 OK
        if (request.status == 200) {
            // evalua data para encontrar 'error'
            request.done(function(data) {
                var e,typ,ti,co;
                if ( data.meta && data.response && data.meta.status_type != SUCCESS ) {
                    typ = data.meta.status_type;
                    ti = data.meta.message;

                    Notify.render(typ, ti, co, config.delay_success);
                    m.callback_fail(request);
                    return false;
                }
            });
            m.callback_done(request);
            return true;
        }
    },
    callback_fail = function ( ) { },
    callback_done = function ( ) { };

    return {
        flag: {
            SUCCESS: SUCCESS,
            INFO: INFO,
            WARNING: WARNING,
            ERROR: ERROR
        },
        config: function ( args ) { $.extend(config, args); return m },
        evaluate: function ( request ) { evaluate( request ); return m },
        fail: function ( fn ) { m.callback_fail = fn; return m },
        done: function ( fn ) { m.callback_done = fn; return m }
    }

})();

////////////////////////////////////////////////////////////////////////////////
// Notify
////////////////////////////////////////////////////////////////////////////////
var Notify = (function() {
    var tpl = ['<div class="message ',,'"><h3>',,'</h3><p>',,'</p></div>'],
    render = function(msgtype, title, message, timeout){
        var timeout = timeout || (1000 * 30);
        tpl[1] = msgtype, tpl[3] = title, tpl[5] = message;
        var m = $(tpl.join(''));
        m = $(m).css({position:'fixed', top:-100}).animate({top:0}).delay(timeout).animate({top:-100}, function(){ cleartime(m) });
        $('body', top.document).append(m);
        return m;
    },

    cleartime = function(m){ $(m).remove() };

    return {
        render: function(msgtype, title, msg, timeout){ this.m = render(msgtype, title, msg, timeout); return this },
        error: function(title, msg, timeout){ this.m = render('error', title, msg, timeout); return this },
        info: function(title, msg, timeout){ this.m = render('info', title, msg, timeout); return this },
        warning: function(title, msg, timeout){ this.m = render('warning', title, msg, timeout); return this },
        success: function(title, msg, timeout){ this.m = render('success', title, msg, timeout); return this },
        clear: function(){ cleartime(this.m); }
    }
}());

////////////////////////////////////////////////////////////////////////////////
// xUI, temaplates simples pero poderosos
//
// como usar:
//
// var data = { user: { name: 'Pepe', age: null } };
//
// xUI.template("Mi nombre es ${ user.name }, y tengo ${ user.age|default:'varios' } años.")
// xUI.render(data)
//
// // Mi nombre es Pepe, y tengo varios años.
//
////////////////////////////////////////////////////////////////////////////////
var xUI = (function(){
    var tpl
    , vars = {}

    // regexp para identificar una variable de template con filtros y demas
    , var_exp = new RegExp(/\$\{\s?([a-zA-Z0-9\_\-\.\|\:\'\"\s]+)\s?\}/g)

    , filters = (function(){
        return {
            'default': function(a,b){ return !a ? b : a },
            'upper': function(a){ return ("" + a).toUpperCase() },
            'lower': function(a){ return ("" + a).toLowerCase() },
            'title': function(a){ 
                var s = ("" + a).split(/\s/); 
                for(var i=0; i<s.length; i++){ 
                    s[i] = s[i][0].toUpperCase() + s[i].slice(1);
                }
                return s.join(' ')
            },
            'toLocalDate': function ( str ) { return new Date(str).toLocaleDateString() },
            'length': function ( obj ) { 
                if ( obj != undefined ) { return obj.length } else { return 0 } 
            },
            'truncateWords': function ( str, len ) { return ("" + str).split(/\s/).slice(0, len).join(' ') }
        }
    }())

    // escape
    , escape_slash = function(a){ return a.replace(/\|/g, '\\|').replace(/\:/g, '\\:') }

    // setea o devuelve el template
    , template = function(a){
        if(a){ 
            tpl = a;
            return xUI
        }
        return tpl
    }

    // crea el context de una variable pra luego parsear y devolver su valor
    , context = function(a){
        return new RegExp('\\$\{\\s\?'+a+'\\s\?\}', 'gi')
    }

    // render context. itera en la data y reemplaza en el template
    , render = function ( data ) {
        if ( toString.call(data) != '[object Array]' ) {
            data = [data];
        }
        var n, result='';
        for ( n = 0; n < data.length; n++ ) {

            var i, var_ctx, ctx, _t = tpl;
            // carga/actualiza las variables del tempalte
            template_vars();

            // itera entre los keys del JSON
            for ( i in vars ) {
                ctx = vars[i].get( data[n] );
                var_ctx = context( vars[i].str );
                /* log console.log( var_ctx, ctx ); */
                _t = _t.replace( var_ctx, ctx);
            }
            result += _t;
        }

        return result
    }

    // obtener todas las vars del template
    , template_vars = function () {
        var match, object_var;

        while( match = var_exp.exec( template() ) ) {
            if ( !vars.hasOwnProperty( match[1] ) ) {
                object_var = resolve_vars( match[1] )
                /* log console.log(match[1], object_var); */
                vars[ match[1] ] = object_var
            } 
            //else {
            //   console.log('no se que hacer con esto?')
            //}
        }
        return vars
    }

    // Resuelve la recursividad de un objeto, retorna el objeto final o undefunid
    , resolve_obj = function ( obj, strobj ) {
        strobj = strobj.split(/\./);
        for ( var i = 0; i < strobj.length; i++ ) {
            if ( obj.hasOwnProperty( strobj[i] ) ) {
                obj = obj[strobj[i]]
            } else return undefined;
        }
        return obj
    }

    // resuelve una variable con filtros, argumentos, etc
    , resolve_vars = function(a){
        a = a.replace(/^\s+|\s+$/,'');
        var parts = /([\w\.]+)(?:\|?(\w+))?(?:\:?(.*))/gi.exec( a ).slice(1)
        obj = parts[0]
        filter = parts[1]
        args = parts[2]
            return {
                str: escape_slash(a),
                obj: obj,
                filter: filter,
                args: args,
                get: function ( obj ) { 
                    // resuelve el contexto de la variable, desde el objeto a renderizar
                    // obj es algo como , user -> user.elemento.elemento.elemento....

                    obj = resolve_obj( obj, this.obj )

                    /* log console.log( o ) */
                    if ( this.filter && filters[ this.filter ] ) {
                        if ( this.args ) {
                            obj = filters[this.filter] ( obj, this.args )
                        }
                        else {
                            obj = filters[this.filter] ( obj )
                        }
                    }

                    return obj
                }
            }
    }

    return {
        template: function(a){ return template(a) },
        context: function(a){ return context(a) },
        render: function(a){ return render(a) },
        getVars: function(){ return template_vars() }
    }

})();

////////////////////////////////////////////////////////////////////////////////
// Un paginador simple - requiere jQuery
// paginate( list, [page], [paginate_by])
// retorna el objeto del paginador
////////////////////////////////////////////////////////////////////////////////
function paginate( data, page, paginate_by ) {

    var paginate_by = paginate_by || 10, 
        pages = 1, 
        last_page = 0, 
        page = page || 1, 
        prev = false, 
        next = false,
        from_item,
        to_item,
        p,
        link = '', 
        url = /^(.*)\/page=\d+\/?$/gi.exec(window.location.hash) || /^(.*)\/$/gi.exec(window.location.hash) || /^(.*)$/gi.exec(window.location.hash);
    
    // resuelve la cantidad de páginas
    if ( data.length > paginate_by ) {
        pages = Math.round ( data.length / paginate_by );
        last_page = data.length % paginate_by;
    }

    // no hay nada mas allá de la úlitma página, así que vuelve a la última.
    if ( page > pages ) {
        page = pages;
    }

    // evalua si tiene una página anterior
    if ( pages > 1 && page > 1 ) { 
        prev = true;
    }
    else {
        prev = false;
    }

    // evalua si tiene una página siguiente
    if ( pages > 1 && page < pages ) {
        next = true;
    }
    else {
        next = false;
    }

    // si esta en la primer página itera desde el principio
    // sino desde el la pagina actual
    if ( page == 1 ) {
        from_item = 0;
    }
    else {
        from_item = ( page - 1 ) * paginate_by;
    }

    to_item = ( page * paginate_by );


    if (  pages <= 1 ) {
        $("#paginador").hide();
    }
    else {
        // itera y genera los links del paginador
        for (p = 1; p <= pages; p++ ) {
            link += "<li" + ( p == page ? " class=\"active\"" : "") + "><a href=\"" + url[1]  + "/page=" + p + "\">" + p + "</a></li>";
        }

        $("#paginador").show();
        $("#paginador ul").html(
            "<li><a href=\"" + url[1] + "/page=" + (prev ? page - 1 : 1) + "\">←</a></li>" + 
            link + 
            "<li><a href=\"" + url[1] + "/page=" + (next ? page + 1 : page ) + "\">→</a></li>"
        );
    }

    return {
        paginate_by : paginate_by, 
        pages : pages, 
        last_page : last_page, 
        page : page, 
        prev : prev, 
        next : next,
        from_item : from_item, 
        to_item : to_item,
        totla_items: data.length
    }

}



////////////////////////////////////////////////////////////////////////////////
// jQuery - Protección automatica para formularios via ajax
////////////////////////////////////////////////////////////////////////////////
(function($){
    $(document).ajaxSend(function(event, xhr, settings) {
        function getCookie(name) {
            var cookieValue = null;
            if (document.cookie && document.cookie != '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        function sameOrigin(url) {
            // url could be relative or scheme relative or absolute
            var host = document.location.host; // host + port
            var protocol = document.location.protocol;
            var sr_origin = '//' + host;
            var origin = protocol + sr_origin;
            // Allow absolute or scheme relative URLs to same origin
            return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
                (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
                // or any other URL that isn't scheme relative or absolute i.e relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }

        if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });
})(window.jQuery);


////////////////////////////////////////////////////////////////////////////////
// jQuery - util para serializar un form a JSON
////////////////////////////////////////////////////////////////////////////////
(function($){
    $.fn.serializeJSON=function() {
        var json = {};
        $.map($(this).serializeArray(), function(n, i){
            json[n['name']] = n['value'];
        });
        return json;
    };
})(window.jQuery);


////////////////////////////////////////////////////////////////////////////////
// jQuery - clase para form-ajax 
////////////////////////////////////////////////////////////////////////////////
(function($){
    $.fn.ajaxsubmit = function(options, callback) {
        
        var callback = typeof callback == 'function' ? callback : typeof options == 'function' ? options : function() {}
        , settings = {
            namespace: 'ajax-submit',
            notify: false,
            cleanOnSuccess: true, // limpia el form luego de retornar con exito
            debug: true,
            initial: {}
        }
        , elements = this;

        if (typeof options != 'function') {  $.extend(settings, options) }

        function clean(element) {
            // limpia el form
            $("textarea, input[type=text]", element).val('');
            $("option:selected, input[type=radio]", element).removeAttr("selected");
            $("input[type=checkbox]:selected", element).removeAttr("checked");
        };

        // recorre los elementos
        this.on("submit."+settings.namespace, function(event) {

            event.preventDefault();

            // simple cache
            var element = $(this)
            , data = $.extend( settings.initial, element.serializeJSON() )
            , action = element.attr('action')
            , promise = $.post(action, data)
            , start_send = Date.now(), info;

            // avisa que esta mandando el form
            if (settings.notify) {
               info = Notify.info("Enviando los datos", "puede tardar un momento :)", 30*1000);
            }

            promise.always(function(data, msg, request) {
                if (settings.notify) { 
                    try { info.clear() } catch ( E ) {}
                    $.when(evaluate_request(request)).then(function () { 
                        callback.apply(element, Array.prototype.slice.call([data,msg,request]));
                        if (settings.cleanOnSuccess) { clean() }
                    });
                } 
            });

            if (!settings.notify) { 
                try { info.clear() } catch ( E ) {}
                $.when(promise).then(function (data, msg, request) { 
                    callback.apply(element, Array.prototype.slice.call([data,msg,request]))
                });
            }

            if (settings.debug) {
                /* log */ console.log('start send', start_send);
                /* log */ console.log('send complete', Date.now());
            }
        });

        return {
            clean: function () { clean(this.element) }
        }
    }
})(window.jQuery);

// Carga underscore si no existe
if ( !window._ ) {
    asyncload( 'http://underscorejs.org/underscore-min.js' );
}
