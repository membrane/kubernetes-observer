function getGeneratorname(name){
    var tmp= name.split("-");
    var ret = "";
    for(var i= 0; i<tmp.length-1; i++){
        ret=ret+tmp[i]+"-";
    }
    return ret;
}
var stillquery=true;
var scroll=true;
function cmp(a, b){
    if(a.length> b.length || b.length> a.length) return false;
    var tmp = true;
    for(var i=0; i< a.length; i++){
        tmp == tmp &&JSON.stringify(a[i].metadata)===JSON.stringify(b[i].metadata);
        if(!tmp) break;
    }
    return tmp;
}
function scrolldown(){
    $(".scrollable0").each(function (index, e) {
        e.scrollTop = 9999999;
    });
    $(".scrollable1").each(function (index, e) {
        e.scrollTop =  9999999;
    });
}
angular.module('kubernetes-observer', [])
    .controller('podsCtrl', function($scope, $http, $timeout){
        var calls=null;
        var choosenPod=null;
        var choosennamespace="default";
        $scope.urls =[];
        $scope.pods =[];
        $scope.namespaces =[];
        $scope.tailLines=50;
        $scope.timeout=500;

        $scope.$watch('choosePod', function(newValue, oldValue) {
            choosenPod=newValue;
            $scope.pods.forEach(function (el) {
                if (el.metadata.name === choosenPod) {
                    $scope.urls = el.urls;
                }
            });
            stillquery=true;
            scroll=true;

        });
        $scope.$watch('chooseNameSpace', function(newValue, oldValue) {
            choosenPod=null;
            choosennamespace=newValue;
            $scope.urls =[];
        });


        $scope.$watch('tailLines', function(newValue, oldValue) {
            $scope.tailLines=newValue;
        });
        $scope.$watch('timeout', function(newValue, oldValue) {
            $scope.timeout=newValue;
        });


        var poller = function() {
            if($scope.tailLines!=0){
                tl="&tailLines=" + $scope.tailLines;
            } else {
                tl="";
            }
            if(scroll){ //to scroll or not to scroll?
                scrolldown();
                scroll=!scroll; //Don't scroll anymore
            }
            if(stillquery) //Query for logchange until logs are not found anymore
                $scope.urls.forEach(function(el){
                    $.get(el.u+tl, function(data,status,xhr){
                        if(status==="success"){
                            r= data;
                            if(r!=el.value){
                                el.value=r;
                                scroll=true;
                            }
                        }
                        else stillquery=false;
                    });
                });

            $http.get('/api/v1/namespaces').then(function(r) {
                //Download list of namespaces
                if(!cmp($scope.namespaces, r.data.items)){
                    $scope.namespaces = r.data.items;
                    choosennamespace="default";
                    $scope.chooseNameSpace="default";
                }
            });

            $http.get('/api/v1/namespaces/'+choosennamespace+'/pods').then(function(r) {
                //Download podlist
                if (!cmp($scope.pods, r.data.items)) {
                    $scope.pods = r.data.items;
                    $scope.pods.forEach(function (el) {
                        el.urls = [];
                        var i = 0;
                        el.spec.containers.forEach(function (e) {
                            el.urls.push({
                                u: "/api/v1/namespaces/" + el.metadata.namespace + "/pods/" + el.metadata.name + "/log?container=" + e.name,
                                i: "scrollable" + i
                            });
                            i++;
                            i %= 2;
                        });

                    });
                }
                if($scope.nachfolgepod) {
                    //Move to the following pod, if this one is replaced
                    if (choosenPod != null) {
                        $scope.pods.forEach(function (el) {
                            if (el.metadata.generateName === getGeneratorname(choosenPod)) {
                                $scope.choosenPod = el.metadata.name;
                            }
                        });
                    }
                }
            });
            calls++;
            $timeout(poller, $scope.timeout);

        };
        poller();
    });
