(function ($) {
    var SupportsTouches = ("ontouchstart" in window);
    var s_com =
    {
        info :{
            "userName": "" //姓名  
        },
        // 获取字节数
        getBytesLen: function (charstr) {
            var totalLength = 0;
            var charCode;
            for (var i = 0; i < charstr.length; i++) {
                charCode = charstr.charCodeAt(i);
                if (charCode < 0x007f) {
                    totalLength++;
                } else if ((0x0080 <= charCode) && (charCode <= 0x07ff)) {
                    totalLength += 2;
                } else if ((0x0800 <= charCode) && (charCode <= 0xffff)) {
                    totalLength += 3;
                } else {
                    totalLength += 4;
                }
            }
            return totalLength;
        },
        // js原生方法以id获取js对象
        getId: function (id) {
            return document.getElementById(id);
        },
        // js原生方法阻止默认行为
        preventDefault: function (ev) {
            if (ev) {
                ev.preventDefault();
            } else {
                window.event ? (window.event.returnValue = false) : "";
            }
        },
        getTarget: function (e) {
            var ev = e ? e : window.event;
            var tarGet = ev ? (ev.target ? ev.target : ev.srcElement) : "";
            return tarGet;
        },
        getTagName: function (e) {
            var tagName = e ? (e.target ? e.target.tagName : e.srcElement.tagName) : "";
            return tagName.toLowerCase();
        },
        safeParam: function (param) {
            if (param) {
                return param.replace("&", "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "");
            } else {
                return "";
            }
        },
        // 获取字符串的长度：一个中文的长度为2
        // 用法:$.s_com.getLen(传入字符串);
        getLen: function (str) {
            var byteLen = 0;
            if (str) {
                for (var i = 0, len = str.length; i < len; i++) {
                    byteLen = str.charCodeAt(i) > 255 ? byteLen + 2 : byteLen + 1;
                }
            }
            return byteLen;
        },
        // js原生多点触摸(适用场景:图片缩放旋转)
        // 返回两点之间的距离,两点的坐标
        getTwoPoint: function (ev) {
            if (!ev) {ev = window.event;}
            var x1 = 0,x2 =0, y1 =0, y2 = 0, sub = { "zValue": 0, "x1": 0, "y1": 0, "x2": 0, "y2": 0 };
            if (SupportsTouches) {
                x1 = ev.touches.item(0).pageX;
                x2 = ev.touches.item(1) ? ev.touches.item(1).pageX : 0;
                y1 = ev.touches.item(0).pageY;
                y2 = ev.touches.item(1) ? ev.touches.item(1).pageY : 0;
                sub.zValue = Math.round(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)));

                sub.x1 = x1;
                sub.y1 = y1;
                sub.x2 = x2;
                sub.y2 = y2;

                return sub;
            }
        },
        // js单点触摸
        // 返回触摸点坐标
        getPoint: function (ev) {
            var xx = 0,
                yy = 0,
		        doc = document.documentElement,
		        body = document.body;
            if (!ev) {ev = window.event;}

            // 如果浏览器支持 pageYOffset, 通过 pageXOffset 和 pageYOffset 获取页面和视窗之间的距离
            if (typeof window.pageYOffset != 'undefined') {
                xx = window.pageXOffset;
                yy = window.pageYOffset;
            }
            // 如果浏览器支持 compatMode, 并且指定了 DOCTYPE, 通过 documentElement 获取滚动距离作为页面和视窗间的距离
            // IE 中, 当页面指定 DOCTYPE, compatMode 的值是 CSS1Compat, 否则 compatMode 的值是 BackCompat
            else if (typeof document.compatMode != 'undefined' && document.compatMode != 'BackCompat') {
                xx = document.documentElement.scrollLeft;
                yy = document.documentElement.scrollTop;
            }
            // 如果浏览器支持 document.body, 可以通过 document.body 来获取滚动高度
            else if (typeof document.body != 'undefined') {
                xx = document.body.scrollLeft;
                yy = document.body.scrollTop;
            }

            // 移动端
            if (SupportsTouches) {
                var evt = ev.touches.item(0); //仅支持单点触摸,第一个触摸点
                xx = evt.pageX;
                yy = evt.pageY;
            } else {
                xx += ev.clientX;
                yy += ev.clientY;
            }
            return { "x": xx, "y": yy };
        },
        // 弹出全屏loading加载层
        pureCSSLoading: function ($obj) {
            // 该方法适用于手机端,用户的交互给予loadign等待
            if ($(".previewloading").length === 0) {
                // 如果没有loading的dom就创建
                // 友好的loading等待效果
                var loadingDom = '<div class="previewloading" style="position:fixed;left:0px;top:0px;width:640px;height:1136px;text-align:center;z-index:10008;background:rgba(0,0,0,.5)"><div class="circulargdiv" style="position:relative;width:128px;height:128px"><img style="width:25px;height:25px;" src="https://rm.sina.com.cn/shanghai/2014/demo/loading.gif" alt=""\/><\/div><\/div>';
                $obj.append(loadingDom);

                // 居中设置样式,宽和高
                $(".previewloading").css({ "height": $(window).height() + "px", "width": $(window).width() + "px" });
                $(".circulargdiv").css({ "margin-top": ($(window).height() - $(".circulargdiv").height()) / 2 + "px", "margin-left": ($(window).width() - $(".circulargdiv").width()) / 2 + "px" });
            } else {
                // 直接显示那个loading层
                $(".previewloading").show();
            }
        },
        // 强制重绘解决异步加载js的未执行问题
        reforceFlow : function(){
            var tempDivID = "reflowDivBlock";
            var domTreeOpDiv = document.getElementById(tempDivID);
            if (!domTreeOpDiv) {
                domTreeOpDiv = document.createElement("div");
                domTreeOpDiv.id = tempDivID;
                document.body.appendChild(domTreeOpDiv);
            }
            var parentNode = domTreeOpDiv.parentNode;
            var nextSibling = domTreeOpDiv.nextSibling;
            parentNode.removeChild(domTreeOpDiv);
            parentNode.insertBefore(domTreeOpDiv, nextSibling);
            domTreeOpDiv.style.visibility = "hidden";
            domTreeOpDiv.innerHTML = "forcereflow";
        },
        // js控制元素的css3动画效果
        transFormForAll: function (obj, param) {
            // css3统一js设置样式,传了改参数就有,不传没有
            var z_index = param.zIndex ? 0 : param.zIndex;
            var deley = param.delay ? param.delay : 0;
            var property = param.property !== undefined ? param.property : "";
            var dynamic = param.dynamic !== undefined ? param.dynamic : "linear";
            var translateX = param.translateX !== undefined ? param.translateX : 0;
            var translateY = param.translateY !== undefined ? param.translateY : 0;
            var translateZ = param.translateZ !== undefined ? param.translateZ : 0;

            translateX = (translateX+"").indexOf("%") > -1 ? translateX : translateX+"px";
            translateY = (translateY+"").indexOf("%") > -1 ? translateY : translateY+"px";
            translateZ = (translateZ+"").indexOf("%") > -1 ? translateZ : translateZ+"px";

            var translate3D = "translate3d(" + translateX + ","+translateY+","+translateZ+")";
            var scaleX = param.scaleX !== undefined ? "scaleX(" + param.scaleX + ")" : "";
            var scaleY = param.scaleY !== undefined ? "scaleY(" + param.scaleY + ")" : "";
            var scaleZ = param.scaleZ !== undefined ? "scaleZ(" + param.scaleZ + ")" : "";
            var skewX = param.skewX !== undefined ? "skewX(" + param.skewX + ")" : "";
            var skewY = param.skewY !== undefined ? "skewY(" + param.skewY + ")" : "";
            var skewZ = param.skewZ !== undefined ? "skewZ(" + param.skewZ + ")" : "";
            var rotate = param.rotate !== undefined ? "rotate(" + param.rotate + "deg)" : "";
            var rotateX = param.rotateX !== undefined ? "rotateX(" + param.rotateX + "deg)" : "";
            var rotateY = param.rotateY !== undefined ? "rotateY(" + param.rotateY + "deg)" : "";
            var rotateZ = param.rotateZ !== undefined ? "rotateZ(" + param.rotateZ + "deg)" : "";
            var alpha = param.alpha !== undefined ? "opacity(" + param.alpha + ")" : "";
            var transform_origin = param["transform-origin"] !== undefined ? param["transform-origin"] : "";
            var styleCss = translate3D + " " + scaleX + " " + scaleY + " " + scaleZ + " " + skewX + " " + skewY + " " + skewZ + " " + rotateX + " " + rotateY + " " + rotateZ + " " + rotate;

            // 统一设置样式性能相对高(reflow)
            obj.css({
                "transition-property": property,
                "-moz-transition-property": "-moz-" + property,
                "-ms-transition-property": "-ms-" + property,
                "-webkit-transition-property": "-webkit-" + property,
                "-o-transition-property": "-o-" + property,
                "transition-duration": param.duraV + "ms",
                "-ms-transition-duration": param.duraV + "ms",
                "-moz-transition-duration": param.duraV + "ms",
                "-webkit-transition-duration": param.duraV + "ms",
                "-o-transition-duration": param.duraV + "ms",
                "transition-timing-function":dynamic,
                "-webkit-transition-timing-function":dynamic,
                "-moz-transition-timing-function":dynamic,
                "-ms-transition-timing-function":dynamic,
                "-o-transition-timing-function":dynamic,
                "transition-delay": deley + "ms",
                "-ms-transition-delay": deley + "ms",
                "-moz-transition-delay": deley + "ms",
                "-webkit-transition-delay": deley + "ms",
                "-o-transition-delay": deley + "ms",
                "transform": styleCss,
                "-ms-transform": styleCss,
                "-moz-transform": styleCss,
                "-webkit-transform": styleCss,
                "-o-transform": styleCss,
                "-webkit-transform-origin": transform_origin,
                "-moz-transform-origin": transform_origin,
                "-ms-transform-origin": transform_origin,
                "-o-transform-origin": transform_origin,
                "transform-origin": transform_origin,
                "opacity": alpha,
                "z-index":z_index
            });
        }
    };
    $.extend({ s_com: s_com });
})(jQuery);
