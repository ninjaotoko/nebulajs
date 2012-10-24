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
        function str2date(str){
            if( $n.utils.isDate(str) ) return str;
            var dt = str.split(" ");
            var date = dt[0].split('-');
            var time = dt[1].split(':');
            return new Date(date[0], date[1], date[2], time[0], time[1], parseInt(time[2]))
        }

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
            // filtro para fechas
            'toLocalDate': function ( str ) { return str2date(str).toLocaleDateString() },
            'getDateDayName': function ( str ) { return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][str2date(str).getDay()] },
            'getDateDay': function ( str ) { 
                var d = str2date(str).getDate();
                if (d<10) { return ('0'+d.toString()) }
                else { return d }
            },
            'getDateMonthName': function ( str ) { 
                return ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][str2date(str).getMonth()] 
            },
            'getDateMonth': function ( str ) { return str2date(str).getMonth() + 1 },
            'getDateYear': function ( str ) { return str2date(str).getFullYear() },
            
            //filtros para horarios
            'getTimeHours': function(str){ return str2date(str).getHours() },
            'getTimeMinutes': function(str){ 
                var d = str2date(str).getMinutes();
                if (d<10) { return ('0'+d.toString()) }
                else { return d }
            },
            'getTimeSeconds': function(str){ 
                var d = str2date(str).getSeconds();
                if (d<10) { return ('0'+d.toString()) }
                else { return d }
            },

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
            if (!vars.hasOwnProperty(match[1])){
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

    // Resuelve la recursividad de un objeto, retorna el objeto final o undefined
    , resolve_obj = function ( obj, strobj ) {
        strobj = strobj.split(/\./);
        for ( var i = 0; i < strobj.length; i++ ) {
            if ( obj.hasOwnProperty( strobj[i] ) || obj[ strobj[i] ]) {
                // identifica si es un metodo del objeto o una propiedad
                if( $n.utils.isFunction( obj[ strobj[i] ] ) ){
                    try{ 
                        obj = obj[ strobj[i] ]( obj )
                    }catch(E){
                        try{ 
                            obj = obj[ strobj[i] ]()
                        }catch(E){}
                    }
                } else {
                    obj = obj[strobj[i]]
                }
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
        getVars: function(){ return template_vars() },
        filters: function(){ return filters }
    }

})();
