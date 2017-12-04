var sSina = {};

//////////////////////////////////////////////////////////////////////////////////////////////
//// 新浪新的js加载方式,所有js异步并行加载,不block页面渲染和展现,是目前主流的前端优化方式
//// 需要配置相关js的路径以及每一个主js的公开变量
//// 配置依赖:
//// [一般主js依赖jquery或者第三方js库]
//// [一般微博登陆的引入js依赖common.js]
//// [一般新浪视频播放引入的js依赖视频全局配置的js,以后统一放入flashplayer.js]
//////////////////////////////////////////////////////////////////////////////////////////////
require({
    "baseUrl":"js",
    // 多个js并行加载
    "paths":{
        "jquerys":"http://all.vic.sina.com.cn/hdcommon/js/jquery/jquery2.1.3.min.js", //jquery库,如果其他第三方库也可以放在这里
        "com":"http://all.vic.sina.com.cn/hdcommon/js/sina.wap.common.0.2.min.js?v=11", // 鉴于common更新比较频繁,而且后续也有不确定的更改,所以独立成为一个js文件来加载
        "muljspath":"http://all.vic.sina.com.cn/hdcommon/js/sina.gesture.min.js?v=9111,/page.js" // 这是我们常编辑,修改的参数:js文件路径,可以使绝对路径或者相对路径(需要配置)
    },
    // 多个js同时加载后等待依赖的加载完了后在执行主js,主js需要是一个对象而不是一个方法,因为方法会在js下载完后就直接执行
    // 主js需要等待依赖项加载完后才执行
    "deps":["jQuery","sSina.common"], // 其他js都依赖这个jquery的加载(根据需要配置)
    "callBack" : function(status){
        // 开始执行主js的逻辑
        // 先判断主js依赖的库是否下载完
        // 再调用require检测主js的各个方法是否下载完了,如果下载完了就挨个执行
        status ? require({
            // 主js中暴露给window的各个变量(需要配置)
            "deps":["sSina.gesture","sSina.page"], // 外部js(flash播放的js以及微博登陆的js)依赖我们常修改的js文件
            "callBack":function(status1){
                
                // 主js加载正确就挨个执行
                if(status1){                    
                    for(var i in sSina){
                        if(i!="page"){
                            sSina[i]();
                        }
                    }
                    // 保证最后执行page.js
                    sSina["page"]();

                    sSina = null;
                }else{
                    alert("您的网络欠佳！");
                }

                // 在这里再加载其他的js
                // 鉴于一些微博登陆的外部js需要主js
                // 鉴于新浪播放器的外部js需要一些事先的配置也在主js中
                // 如果没有微博登陆和视频播放可以省略一下require代码
//                require({
//                    // 多个外部js并行加载(需要配置)
//                    // 还有项目需要视频flash的js
//                    "paths":{
//                        "ssoscript":"http://i.sso.sina.com.cn/js/ssologin.js"
//                    }
//                });
            }    
        }) : alert("您的网络欠佳！");
    }
});