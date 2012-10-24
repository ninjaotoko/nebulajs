////////////////////////////////////////////////////////////////////////////////
// Implementación simple de modelos y queryset en javascript
////////////////////////////////////////////////////////////////////////////////

var fields = {
    text: function(){ /* acepta strings */ },
    data: function(){ /* acepta... */ }
}


var register_app = (function(){
    var app_model = {},
        register = function(app, models){
            models_in_app = app_model[app] || (app_model[app]=[]);
            app_model[app] = models_in_app.concat(models);
        },
        installed = function(){
            return app_model
        }

    return {
        register: function(app, models){ register(app, models); return this },
        installed: function(){ return installed() }
    }
}())

var Models = function(object){
    // object es una representación de como va a ser el modelo de datos.
    // ej: un post
    // { id: 1, name: 'Tito', email: ... }

    var model = this,
        _object = object,
        _id = _object.id || null;

    function _clone(){
        var i,
            m = {},
            fields = model.getFields();

        for(i = 0; i < fields.length; i++){
            m[fields[i]] = model[fields[i]]
        }

        return m
    }

    function _new(){
        var k, 
            m = {},
            fields = model.getFields();

        for(k in model){
            if(fields.indexOf(k)<0){
                m[k] = model[k]
            } else {
                m[k] = null
            }
        }

        return m
    }

    function pre_save(data){
        // algo para hacer

        model.pre_save(data)
    }

    function post_save(data){
        // algo para hacer

        model.post_save(data)
    }

    function save(){
        var data = model._clone();

        pre_save(data);

        if(model.id){
            console.log('preparado para guardar el objeto ID', model.id, api, data);
        }
        else {
            console.log('preparado para crear el objeto', api, data);
        }

        post_save(data);
    }

    model._object = _object;
    model.id = _id;

    model.getFields = function(){
        return Object.keys(model._object)
    }

    model.save = function(){ //envia los datos al server
        return save()
    }

    model._clone = function(){ //devuelve una copia de los datos del modelo
        return _clone()
    }


    model._new = function(){ //devuelve un nuevo modelo de este tipo
        return _new()
    }

    model.pre_save = function(){}
    model.post_save = function(){}

    for(var k in model._object){
        model[k] = model._object[k]
    }
}
