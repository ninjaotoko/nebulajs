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
// Estas utilidades son funciones variadas que resuelven tareas típicas y que
// se pueden reutilizar.
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
// xargs es una función que mapea un array o diccionario con los datos pasados
// en una función y los transforma en un mapeo de arguemntos. El mapeo es
// ordinal por lo que es necesario ordenarlo como el orden de argumentos.
//
// xargs(arguments, mapping) -> mapping arguments
// 
//
// ejemplo:
// function(){
//     var args = xargs(arguments, {
//         obj: Object, /* requiere un tipo Object */
//         key: String,
//         val: undefined o void(0), /* es opcional */
//         callback: function(){} /* setea un argumento por defecto */
//     })
// }
//
////////////////////////////////////////////////////////////////////////////////
var xargs = function(args, map){
    // siempre undefined
    undefined = void(0);

    if (!args && !map) { 
        throw "Los argumentos no son válidos.\nxargs(arguments, mapping) -> mapping arguments"
    }

    var c, keys, kwargs={};
    keys = map;
    for(c=0; c < keys.length; c++){

        // chequea si es un arg opcional
        //if (map[ keys[c] ] == undefined && args[ keys[c] ] == undefined){
        //    continue;
        //}

        kwargs[keys[c]] = args[c];
    }

    return kwargs;
}


////////////////////////////////////////////////////////////////////////////////
// AsyncLoad, para cargar javascript de forma asyncrona.
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
// Slugify, utilidad para crear slugs
////////////////////////////////////////////////////////////////////////////////
var slugify = function( str ) {
    //return String(str).replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-]/g,'').toLowerCase();
    str = $n.utils.trim(String(str));
    var val = "",
        map = {"2d":"-","20":"-","24":"s","26":"and","30":"0","31":"1","32":"2","33":"3","34":"4","35":"5","36":"6","37":"7","38":"8","39":"9","41":"A","42":"B","43":"C","44":"D","45":"E","46":"F","47":"G","48":"H","49":"I","50":"P","51":"Q","52":"R","53":"S","54":"T","55":"U","56":"V","57":"W","58":"X","59":"Y","61":"a","62":"b","63":"c","64":"d","65":"e","66":"f","67":"g","68":"h","69":"i","70":"p","71":"q","72":"r","73":"s","74":"t","75":"u","76":"v","77":"w","78":"x","79":"y","100":"A","101":"a","102":"A","103":"a","104":"A","105":"a","106":"C","107":"c","108":"C","109":"c","110":"D","111":"d","112":"E","113":"e","114":"E","115":"e","116":"E","117":"e","118":"E","119":"e","120":"G","121":"g","122":"G","123":"g","124":"H","125":"h","126":"H","127":"h","128":"I","129":"i","130":"I","131":"i","132":"IJ","133":"ij","134":"J","135":"j","136":"K","137":"k","138":"k","139":"L","140":"l","141":"L","142":"l","143":"N","144":"n","145":"N","146":"n","147":"N","148":"n","149":"n","150":"O","151":"o","152":"OE","153":"oe","154":"R","155":"r","156":"R","157":"r","158":"R","159":"r","160":"S","161":"s","162":"T","163":"t","164":"T","165":"t","166":"T","167":"t","168":"U","169":"u","170":"U","171":"u","172":"U","173":"u","174":"W","175":"w","176":"Y","177":"y","178":"Y","179":"Z","180":"b","181":"B","182":"b","183":"b","184":"b","185":"b","186":"C","187":"C","188":"c","189":"D","190":"E","191":"F","192":"f","193":"G","194":"Y","195":"h","196":"i","197":"I","198":"K","199":"k","200":"A","201":"a","202":"A","203":"a","204":"E","205":"e","206":"E","207":"e","208":"I","209":"i","210":"R","211":"r","212":"R","213":"r","214":"U","215":"u","216":"U","217":"u","218":"S","219":"s","220":"n","221":"d","222":"8","223":"8","224":"Z","225":"z","226":"A","227":"a","228":"E","229":"e","230":"O","231":"o","232":"Y","233":"y","234":"l","235":"n","236":"t","237":"j","238":"db","239":"qp","240":"<","241":"?","242":"?","243":"B","244":"U","245":"A","246":"E","247":"e","248":"J","249":"j","250":"a","251":"a","252":"a","253":"b","254":"c","255":"e","256":"d","257":"d","258":"e","259":"e","260":"g","261":"g","262":"g","263":"Y","264":"x","265":"u","266":"h","267":"h","268":"i","269":"i","270":"w","271":"m","272":"n","273":"n","274":"N","275":"o","276":"oe","277":"m","278":"o","279":"r","280":"R","281":"R","282":"S","283":"f","284":"f","285":"f","286":"f","287":"t","288":"t","289":"u","290":"Z","291":"Z","292":"3","293":"3","294":"?","295":"?","296":"5","297":"C","298":"O","299":"B","363":"a","364":"e","365":"i","366":"o","367":"u","368":"c","369":"d","386":"A","388":"E","389":"H","390":"i","391":"A","392":"B","393":"r","394":"A","395":"E","396":"Z","397":"H","398":"O","399":"I","400":"E","401":"E","402":"T","403":"r","404":"E","405":"S","406":"I","407":"I","408":"J","409":"jb","410":"A","411":"B","412":"B","413":"r","414":"D","415":"E","416":"X","417":"3","418":"N","419":"N","420":"P","421":"C","422":"T","423":"y","424":"O","425":"X","426":"U","427":"h","428":"W","429":"W","430":"a","431":"6","432":"B","433":"r","434":"d","435":"e","436":"x","437":"3","438":"N","439":"N","440":"P","441":"C","442":"T","443":"Y","444":"qp","445":"x","446":"U","447":"h","448":"W","449":"W","450":"e","451":"e","452":"h","453":"r","454":"e","455":"s","456":"i","457":"i","458":"j","459":"jb","460":"W","461":"w","462":"Tb","463":"tb","464":"IC","465":"ic","466":"A","467":"a","468":"IA","469":"ia","470":"Y","471":"y","472":"O","473":"o","474":"V","475":"v","476":"V","477":"v","478":"Oy","479":"oy","480":"C","481":"c","490":"R","491":"r","492":"F","493":"f","494":"H","495":"h","496":"X","497":"x","498":"3","499":"3","500":"d","501":"d","502":"d","503":"d","504":"R","505":"R","506":"R","507":"R","508":"JT","509":"JT","510":"E","511":"e","512":"JT","513":"jt","514":"JX","515":"JX","531":"U","532":"D","533":"Q","534":"N","535":"T","536":"2","537":"F","538":"r","539":"p","540":"z","541":"2","542":"n","543":"x","544":"U","545":"B","546":"j","547":"t","548":"n","549":"C","550":"R","551":"8","552":"R","553":"O","554":"P","555":"O","556":"S","561":"w","562":"f","563":"q","564":"n","565":"t","566":"q","567":"t","568":"n","569":"p","570":"h","571":"a","572":"n","573":"a","574":"u","575":"j","576":"u","577":"2","578":"n","579":"2","580":"n","581":"g","582":"l","583":"uh","584":"p","585":"o","586":"S","587":"u","4a":"J","4b":"K","4c":"L","4d":"M","4e":"N","4f":"O","5a":"Z","6a":"j","6b":"k","6c":"l","6d":"m","6e":"n","6f":"o","7a":"z","a2":"c","a3":"f","a5":"Y","a7":"s","a9":"c","aa":"a","ae":"r","b2":"2","b3":"3","b5":"u","b6":"p","b9":"1","c0":"A","c1":"A","c2":"A","c3":"A","c4":"A","c5":"A","c6":"AE","c7":"C","c8":"E","c9":"E","ca":"E","cb":"E","cc":"I","cd":"I","ce":"I","cf":"I","d0":"D","d1":"N","d2":"O","d3":"O","d4":"O","d5":"O","d6":"O","d7":"X","d8":"O","d9":"U","da":"U","db":"U","dc":"U","dd":"Y","de":"p","df":"b","e0":"a","e1":"a","e2":"a","e3":"a","e4":"a","e5":"a","e6":"ae","e7":"c","e8":"e","e9":"e","ea":"e","eb":"e","ec":"i","ed":"i","ee":"i","ef":"i","f0":"o","f1":"n","f2":"o","f3":"o","f4":"o","f5":"o","f6":"o","f8":"o","f9":"u","fa":"u","fb":"u","fc":"u","fd":"y","ff":"y","10a":"C","10b":"c","10c":"C","10d":"c","10e":"D","10f":"d","11a":"E","11b":"e","11c":"G","11d":"g","11e":"G","11f":"g","12a":"I","12b":"i","12c":"I","12d":"i","12e":"I","12f":"i","13a":"l","13b":"L","13c":"l","13d":"L","13e":"l","13f":"L","14a":"n","14b":"n","14c":"O","14d":"o","14e":"O","14f":"o","15a":"S","15b":"s","15c":"S","15d":"s","15e":"S","15f":"s","16a":"U","16b":"u","16c":"U","16d":"u","16e":"U","16f":"u","17a":"z","17b":"Z","17c":"z","17d":"Z","17e":"z","17f":"f","18a":"D","18b":"d","18c":"d","18d":"q","18e":"E","18f":"e","19a":"l","19b":"h","19c":"w","19d":"N","19e":"n","19f":"O","1a0":"O","1a1":"o","1a2":"P","1a3":"P","1a4":"P","1a5":"p","1a6":"R","1a7":"S","1a8":"s","1a9":"E","1aa":"l","1ab":"t","1ac":"T","1ad":"t","1ae":"T","1af":"U","1b0":"u","1b1":"U","1b2":"U","1b3":"Y","1b4":"y","1b5":"Z","1b6":"z","1b7":"3","1b8":"3","1b9":"3","1ba":"3","1bb":"2","1bc":"5","1bd":"5","1be":"5","1bf":"p","1c4":"DZ","1c5":"Dz","1c6":"dz","1c7":"Lj","1c8":"Lj","1c9":"lj","1ca":"NJ","1cb":"Nj","1cc":"nj","1cd":"A","1ce":"a","1cf":"I","1d0":"i","1d1":"O","1d2":"o","1d3":"U","1d4":"u","1d5":"U","1d6":"u","1d7":"U","1d8":"u","1d9":"U","1da":"u","1db":"U","1dc":"u","1dd":"e","1de":"A","1df":"a","1e0":"A","1e1":"a","1e2":"AE","1e3":"ae","1e4":"G","1e5":"g","1e6":"G","1e7":"g","1e8":"K","1e9":"k","1ea":"Q","1eb":"q","1ec":"Q","1ed":"q","1ee":"3","1ef":"3","1f0":"J","1f1":"dz","1f2":"dZ","1f3":"DZ","1f4":"g","1f5":"G","1f6":"h","1f7":"p","1f8":"N","1f9":"n","1fa":"A","1fb":"a","1fc":"AE","1fd":"ae","1fe":"O","1ff":"o","20a":"I","20b":"i","20c":"O","20d":"o","20e":"O","20f":"o","21a":"T","21b":"t","21c":"3","21d":"3","21e":"H","21f":"h","22a":"O","22b":"o","22c":"O","22d":"o","22e":"O","22f":"o","23a":"A","23b":"C","23c":"c","23d":"L","23e":"T","23f":"s","24a":"Q","24b":"q","24c":"R","24d":"r","24e":"Y","24f":"y","25a":"e","25b":"3","25c":"3","25d":"3","25e":"3","25f":"j","26a":"i","26b":"I","26c":"I","26d":"I","26e":"h","26f":"w","27a":"R","27b":"r","27c":"R","27d":"R","27e":"r","27f":"r","28a":"u","28b":"v","28c":"A","28d":"M","28e":"Y","28f":"Y","29a":"B","29b":"G","29c":"H","29d":"j","29e":"K","29f":"L","2a0":"q","2a1":"?","2a2":"c","2a3":"dz","2a4":"d3","2a5":"dz","2a6":"ts","2a7":"tf","2a8":"tc","2a9":"fn","2aa":"ls","2ab":"lz","2ac":"ww","2ae":"u","2af":"u","2b0":"h","2b1":"h","2b2":"j","2b3":"r","2b4":"r","2b5":"r","2b6":"R","2b7":"W","2b8":"Y","2df":"x","2e0":"Y","2e1":"1","2e2":"s","2e3":"x","2e4":"c","36a":"h","36b":"m","36c":"r","36d":"t","36e":"v","36f":"x","37b":"c","37c":"c","37d":"c","38a":"I","38c":"O","38e":"Y","38f":"O","39a":"K","39b":"A","39c":"M","39d":"N","39e":"E","39f":"O","3a0":"TT","3a1":"P","3a3":"E","3a4":"T","3a5":"Y","3a6":"O","3a7":"X","3a8":"Y","3a9":"O","3aa":"I","3ab":"Y","3ac":"a","3ad":"e","3ae":"n","3af":"i","3b0":"v","3b1":"a","3b2":"b","3b3":"y","3b4":"d","3b5":"e","3b6":"c","3b7":"n","3b8":"0","3b9":"1","3ba":"k","3bb":"j","3bc":"u","3bd":"v","3be":"c","3bf":"o","3c0":"tt","3c1":"p","3c2":"s","3c3":"o","3c4":"t","3c5":"u","3c6":"q","3c7":"X","3c8":"Y","3c9":"w","3ca":"i","3cb":"u","3cc":"o","3cd":"u","3ce":"w","3d0":"b","3d1":"e","3d2":"Y","3d3":"Y","3d4":"Y","3d5":"O","3d6":"w","3d7":"x","3d8":"Q","3d9":"q","3da":"C","3db":"c","3dc":"F","3dd":"f","3de":"N","3df":"N","3e2":"W","3e3":"w","3e4":"q","3e5":"q","3e6":"h","3e7":"e","3e8":"S","3e9":"s","3ea":"X","3eb":"x","3ec":"6","3ed":"6","3ee":"t","3ef":"t","3f0":"x","3f1":"e","3f2":"c","3f3":"j","3f4":"O","3f5":"E","3f6":"E","3f7":"p","3f8":"p","3f9":"C","3fa":"M","3fb":"M","3fc":"p","3fd":"C","3fe":"C","3ff":"C","40a":"Hb","40b":"Th","40c":"K","40d":"N","40e":"Y","40f":"U","41a":"K","41b":"jI","41c":"M","41d":"H","41e":"O","41f":"TT","42a":"b","42b":"bI","42c":"b","42d":"E","42e":"IO","42f":"R","43a":"K","43b":"JI","43c":"M","43d":"H","43e":"O","43f":"N","44a":"b","44b":"bI","44c":"b","44d":"e","44e":"io","44f":"r","45a":"Hb","45b":"h","45c":"k","45d":"n","45e":"y","45f":"u","46a":"mY","46b":"my","46c":"Im","46d":"Im","46e":"3","46f":"3","47a":"O","47b":"o","47c":"W","47d":"w","47e":"W","47f":"W","48a":"H","48b":"H","48c":"B","48d":"b","48e":"P","48f":"p","49a":"K","49b":"k","49c":"K","49d":"k","49e":"K","49f":"k","4a0":"K","4a1":"k","4a2":"H","4a3":"h","4a4":"H","4a5":"h","4a6":"Ih","4a7":"ih","4a8":"O","4a9":"o","4aa":"C","4ab":"c","4ac":"T","4ad":"t","4ae":"Y","4af":"y","4b0":"Y","4b1":"y","4b2":"X","4b3":"x","4b4":"TI","4b5":"ti","4b6":"H","4b7":"h","4b8":"H","4b9":"h","4ba":"H","4bb":"h","4bc":"E","4bd":"e","4be":"E","4bf":"e","4c0":"I","4c1":"X","4c2":"x","4c3":"K","4c4":"k","4c5":"jt","4c6":"jt","4c7":"H","4c8":"h","4c9":"H","4ca":"h","4cb":"H","4cc":"h","4cd":"M","4ce":"m","4cf":"l","4d0":"A","4d1":"a","4d2":"A","4d3":"a","4d4":"AE","4d5":"ae","4d6":"E","4d7":"e","4d8":"e","4d9":"e","4da":"E","4db":"e","4dc":"X","4dd":"X","4de":"3","4df":"3","4e0":"3","4e1":"3","4e2":"N","4e3":"n","4e4":"N","4e5":"n","4e6":"O","4e7":"o","4e8":"O","4e9":"o","4ea":"O","4eb":"o","4ec":"E","4ed":"e","4ee":"Y","4ef":"y","4f0":"Y","4f1":"y","4f2":"Y","4f3":"y","4f4":"H","4f5":"h","4f6":"R","4f7":"r","4f8":"bI","4f9":"bi","4fa":"F","4fb":"f","4fc":"X","4fd":"x","4fe":"X","4ff":"x","50a":"H","50b":"h","50c":"G","50d":"g","50e":"T","50f":"t","51a":"Q","51b":"q","51c":"W","51d":"w","53a":"d","53b":"r","53c":"L","53d":"Iu","53e":"O","53f":"y","54a":"m","54b":"o","54c":"N","54d":"U","54e":"Y","54f":"S","56a":"d","56b":"h","56c":"l","56d":"lu","56e":"d","56f":"y","57a":"w","57b":"2","57c":"n","57d":"u","57e":"y","57f":"un"};

    for(var i = 0; i < str.length; i++){
        val += map[ str.charCodeAt(i).toString(16) ] || "";
    }
    return val.toLowerCase();

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
            delay_fail: 5000,
            delay_info: 6000,
            delay_success: 3500
        },
        SUCCESS = 'success',
        INFO = 'info',
        WARNING = 'warning',
        ERROR = 'error',
    
    evaluate = function (data, msg, request) {
        console.log(data, msg, request)
        // ERROR 500
        if (request.status == 500 || data.status == 500) {
            Notify.error('Error ;(', 'Algo ha fallado, intenta nuevamente!', config.delay_fail);
        }
        // ERROR 404
        if (request.status == 404 || data.status == 404) {
            Notify.warning('Cuidado :(', 'Al parecer eso no hace nada ¿?', config.delay_fail);
        }
        // ERROR 403
        if (request.status == 403 || data.status == 403) {
            Notify.warning('Cuidado :(', 'Al parecer eso no hace nada, recuerda logearte para usar el sistema.', config.delay_info);
        }
        // INFO 304
        if (request.status == 304 || data.status == 304) {
            Notify.info('Cargando :)', 'cargando bytes...', config.delay_info);
            return true;
        }
        // 200 OK
        if (request.status == 200 || data.status == 200) {
            // evalua data para encontrar 'error'
            // si request es NO es un objecto entonces data toma su lugar
            if ( $n.utils.isObject(data) && !$n.utils.isObject(request) ) {
                request = data
            }
            request.done(function(data) {
                var e,typ,ti,co;
                if ( data.meta && data.response && data.meta.status_type != SUCCESS ) {
                    typ = data.meta.status_type;
                    ti = data.meta.message;

                    Notify.render(typ, ti, co, config.delay_success);
                    callback_fail(data, request);
                    return false;
                }
                else {
                    callback_done(data, request);
                }
            });
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
        config: function ( args ) { $.extend(config, args); return this },
        evaluate: function ( data, msg, request ) { evaluate( data, msg, request ); return this },
        fail: function ( fn ) { callback_fail = fn; return this },
        done: function ( fn ) { callback_done = fn; return this }
    }

})();

////////////////////////////////////////////////////////////////////////////////
// Notify
////////////////////////////////////////////////////////////////////////////////
var Notify = (function() {
    var tpl = ['<div class="notify-message-bar"><div class="notify message ',,'"><h3>',,'</h3><p>',,'</p></div></div>'],
    render = function(msgtype, title, message, timeout, fn){
        var m, timeout = timeout || (1000 * 30);

        tpl[1] = msgtype;
        tpl[3] = title;
        tpl[5] = message;

        m = $(tpl.join(''));
        m = $(m).css({
            position:'fixed', 
            top:-100
        }).animate({
            top:0
        }).delay(timeout).animate({
            top:-100
        }, function(){ 
            cleartime(m, fn)
        });

        $('body', top.document).append(m);
        return m;
    },

    cleartime = function(m, fn){ 
        $(m).remove();
        if(fn){
            fn()
        }
    };

    return {
        render: function(msgtype, title, msg, timeout, fn){ this.m = render(msgtype, title, msg, timeout, fn); return this },
        error: function(title, msg, timeout, fn){ this.m = render('error', title, msg, timeout, fn); return this },
        info: function(title, msg, timeout, fn){ this.m = render('info', title, msg, timeout, fn); return this },
        warning: function(title, msg, timeout, fn){ this.m = render('warning', title, msg, timeout, fn); return this },
        success: function(title, msg, timeout, fn){ this.m = render('success', title, msg, timeout, fn); return this },
        clear: function(fn){ cleartime(this.m, fn); return this }
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
    , var_exp = new RegExp(/\$\{\s?([a-zA-Z0-9\_\-\.\|\:\'\"\/\s]+)\s?\}/g)

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
        if ( !$n.utils.isArray(data) ) {
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
        var parts = /([\w\.]+)(?:\|?(\w+))?(?:\:?(.*))/gi.exec( a ).slice(1),
            obj = parts[0],
            filter = parts[1],
            args = parts[2];

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

        pages = pages * paginate_by < data.length ? pages+1 : pages;

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

    from_item = ( page - 1 ) * paginate_by;
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

    function goto_page(page) {
        var step;
        try {
            step = parseInt(page);
        } catch (err) {
            if ( next && page == 'next') { step = 1; }
            if ( prev && page == 'previous') { step = -1; }
        }
        page = page + step;
        next = false; prev = false;
        if (page < last_page) { next = true; }
        if ( page == 1 ) { prev = true; }
        from_item = ( page - 1 ) * paginate_by;
        to_item = ( page * paginate_by );
        return this.get_page();
    }

    function get_page() {
        qs.slice(from_item, to_item);
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
        total_items: data.length,
        qs: data,
        goto_page: goto_page,
        get_page: get_page
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
        
        var m = this,
            callback = typeof callback == 'function' ? callback : typeof options == 'function' ? options : function() {},
            settings = {
                namespace: 'ajax-submit',
                notify: false,
                cleanOnSuccess: true, // limpia el form luego de retornar con exito
                debug: true,
                initial: {}
            },
            elements = this;

        if (typeof options != 'function') {  $.extend(settings, options) }

        function clean(element) {
            // limpia el form
            $("textarea, input[type=text], input[type=password]", element).val('');
            $("option:selected, input[type=radio]", element).removeAttr("selected");
            $("input[type=checkbox]:selected", element).removeAttr("checked");
        }

        // recorre los elementos
        this.on("submit."+settings.namespace, function(event) {

            event.preventDefault();

            // simple cache
            var start_send = Date.now(),
                element = $(this),
                datajson = element.serializeJSON(),
                initial = typeof settings.initial == 'function' ? settings.initial(datajson) : settings.initial,
                data = $.extend(initial, datajson),
                action = element.attr('action'),
                promise = $.post(action, data),
                info;

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
                    }).fail(function(){
                        callback.apply(element, Array.prototype.slice.call([data,msg,request]));
                    });
                } 
            }).fail(function(){ try { info.clear() } catch ( E ) {} });

            if (!settings.notify) { 
                try { info.clear() } catch ( E ) {}
                $.when(promise).then(function (data, msg, request) { 
                    callback.apply(element, Array.prototype.slice.call([data,msg,request]))
                }).fail(function (data, msg, request) { 
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

//////////////////////////////////////////////////////////////////////////////// 
// Data Grid - Plugin that takes a table turns it into a sortable
// Requirements: <thead> + ".sort" inside each th to use as 
// sort + data-sort attr to set the target class
// use .exsort to exclude a row from being sorted
//////////////////////////////////////////////////////////////////////////////// 
(function($){
    $.fn.DataGrid = function(config) {        
        var table = this;
        var config = config;
        var pager = paginate($('tbody tr', table).clone(true), 1, config['paginate_by']);
        table.data('pager', pager);
        $('thead th .sort', table).click( function (ev) {
            ev.preventDefault();
            var asc = $(this).data('ascending');
            var field = $(this).attr('data-sort');
            var l = pager.qs.sort( function (a,b ) { 
                if ( $(a).hasClass('exsort') || $(b).hasClass('exsort') ) { return 0; }
                var a = $('td.' + field , a).text().trim().toLowerCase();
                var b = $('td.' + field , b).text().trim().toLowerCase();
                if ( a.split('/').length == 3 && b.split('/').length ) { // Might be a date
                    try {
                        _a = new Date( a.split('/').reverse() );
                        _b = new Date( b.split('/').reverse() );
                        if ( _a && _b ) { a = _a; b = _b; }
                    }
                    catch (err) { /* do nothing */ }
                }
                if ( asc ) { return  a < b ? 1 : -1; }
                return  a > b ? 1 : -1; 
            });
            table.find('tbody').empty().append(l.slice(pager.from_item, pager.to_item).clone());
            if ( asc ) { $(this).data('ascending', false); }
            else { $(this).data('ascending', true); }
        });
        return this;
    };
})(window.jQuery);


// Carga underscore si no existe
if ( !window._ ) {
    asyncload( 'http://underscorejs.org/underscore-min.js' );
}
