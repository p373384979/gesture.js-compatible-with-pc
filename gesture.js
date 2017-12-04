///////////////////////////////////////////////////////////////////////////////////
//// 移动端元素(图片)移动,缩放,旋转
//// File: sina.gesture.js,支持移动,快速点击,按压,拖动,左,右,上,下,旋转,放大,缩小的手势操作
//// Defines: 使用方法
//// $("#previewimg").gesture({
////    "touchstart":function(){}, // touch的传入方法
////    "tap":null, // 快速点击传入方法
////    "press":null, // 按压传入方法
////    "drag":null, // 移动,拖动元素传入方法
////    "swipe":{"left":function(){},"right":function(){},"up":function(){},"down":function()}, // 左划,右划,上划,下划传入方法
////    "rotateL":null, // 左旋转传入方法
////    "rotateR":null, // 左旋转传入方法
////    "zoom":null, // 缩放传入方法
////    "end":function(){}, // touchend,touchcancel,mouseout,mouseup等传入事件
////    "moveAble" : null// 如果存在这个id表示:用户可以在图片外的父级元素进行移动操作
//// });
//// 配置moveAble可以增大操控区域
//// Copyright (c) 2013 by Sina Corporation. All rights reserved.
//// 联系人 Even:373384979
//// 2016年05月18解决了this指向的问题
///////////////////////////////////////////////////////////////////////////////////
///// <reference path="jquery-1.4.2.js" />
//// 对common.js有依赖
(function ($) {
    var defaults = {
        "touchstart": null, // touch的传入方法
        "tap": null, // 快速点击
        "press": null, // 按压
        "drag": null, // 移动,拖动元素
        "swipe": null, // 左划,右划,上划,下划
        "rotateL": null, // 左旋转
        "rotateR": null, // 左旋转
        "zoom": null, // 缩放
        "moveAble": null, // 如果存在这个id表示:用户可以在图片外的父级元素进行移动操作
        "tapMaxDistance": 10, // 被判定为点击的最大移动距离,即时间比较短+距离也短手指操作被视为用户的点击行为
        "tapTime": 200, // 延迟200毫秒执行tap的事件,如果有特殊需求可以改长改短
        "holdTime": 900, // 在这个时间里边都是点击的有效标准(对于一些内嵌浏览器,tap的时间比较长，遂延迟至1000ms)
        "maxDoubleTapInterval": 300, // 被视为两次连续点击(双击)的标准间隔
        "doubleTap": false // 是否支持双击
    };

    var hasTouch = ("ontouchstart" in window) && /iphone|mobile|android/.test(navigator.userAgent.toLowerCase()),
        __tapped,
        __pressTimer,
        __tapTimer,
        startTime,
        __prev_tapped_end_time = 0,
        __prev_tapped_pos = null, actionType, zoomRatio;
    // 移动端事件和PC端事件
    var mouseEvents = "mouseup mousedown mousemove mouseout",
        touchEvents = "touchstart touchmove touchend touchcancel";
    var bindingEvents = hasTouch ? touchEvents : mouseEvents;

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// 反三角函数的角度计算(通过斜率算得)用atan是不能知道up,down的,因为atan的取值范围是-PI/2到PI/2换算到角度是90度到-90度
    /// 但是atan是可以用来判断旋转的方向的,因为旋转方向的计算方法是新角度减去旧角度和度数关系不大而和变化的正负有关.
    /// 传入参数:param,两个点
    /// 返回-90到90度之间的角度
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function getAngle(param) {
        var diff_x = param.x2 - param.x1,
            diff_y = param.y2 - param.y1;

        //返回角度
        return 180 * Math.atan(diff_y / diff_x) / Math.PI;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // 四象限的计算方法atan2
    // 传入两个点 param
    // 返回-180度到180度之间的角度(满足四象限)
    // 因为页面坐标和传统二维坐标不同,Y轴向下,
    // 所以-135度和-45度之间是up,45度和135度之间是down
    // 所以-45度和45度之间是right,<=-135度和>=135度之间是left
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function getAngel2(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    }

    // 获取单点触摸的用户行为,up,down,left,right
    function getDirection(agl) {
        var directions = {
            up: agl < -45 && agl > -135, // 上滑
            down: agl >= 45 && agl < 135, // 下滑
            left: agl >= 135 || agl <= -135, // 左滑
            right: agl >= -45 && agl <= 45 // 右滑
        };
        for (var key in directions) {
            if (directions[key]) return key;
        }
        return null;
    }

    // 获取两点之间的距离
    function getDistance(pos1, pos2) {
        var x = pos2.x - pos1.x,
            y = pos2.y - pos1.y;
        return Math.sqrt((x * x) + (y * y));
    }

    // 单指点击和两次点击
    $.fn.tap = function (e, p1, p2, tap, settings) {
        var $this = this;
        var now = Date.now();
        var touchTime = now - startTime;

        // 手指移开的时候获取两点(如果没有移动就是一点)之间的距离
        var distance = getDistance(p1, actionType == "move" ? p2 : p1);

        // 取消掉按压的方法执行
        clearTimeout(__pressTimer);

        // 判断是不是双击
        var isDoubleTap = (function () {
            if (__prev_tapped_pos && settings.doubleTap && (startTime - __prev_tapped_end_time) < settings.maxDoubleTapInterval) {
                var doubleDis = getDistance(__prev_tapped_pos, p1);
                if (doubleDis < 16) return true;
            }

            return false;
        })();

        if (isDoubleTap) {
            clearTimeout(__tapTimer);
            // 执行tap
            tap ? tap.call($this,"doubletap", e, p1, p2) : "";
            return;
        }

        // 如果点击过程中有移动,且移动的距离大于"点击的评判标准"就视为无效点击
        if (settings.tapMaxDistance < distance) return;

        // 是一次有效的点击
        if (settings.holdTime > touchTime && $.fn.getFingers(e) <= 1) {
            __tapped = true;

            __prev_tapped_end_time = now;
            __prev_tapped_pos = p1;
            clearTimeout(__tapTimer);
            __tapTimer = setTimeout(function () {
                tap ? (Math.abs(p2.x-p1.x) <= 10) && tap.call($this,"tap", e, p1, p2) : "";
            }, settings.tapTime);
        }

    };

    // 按压
    $.fn.press = function (e, p1, p2, press, settings) {
        var $this = this;
        // 阻止默认行为
        $.s_com.preventDefault(e);
        if (press) {
            clearTimeout(__pressTimer);
            __pressTimer = setTimeout(function () {
                //if (!pos.start) return;
                var distance = getDistance(p1, actionType == "move" ? p2 : p1);
                if (settings.tapMaxDistance < distance) return;

                if (!__tapped) {
                    press.call($this,e, p1, p2);
                }
            },settings.holdTime);
        }
    };

    $.fn.getFingers = function (ev) {
        return ev.touches ? ev.touches.length : 1;
    };
    // 单指上滑,下滑,左划,右划
    $.fn.swipe = function (e, p1, p2, swipe) {
        var angle = getAngel2(p1, p2);
        var direction = getDirection(angle);
        // 单指上/下/左/右滑(direction取值:up,down,left,right) 
        swipe[direction] ? swipe[direction].call(this,e, p1, p2) : "";
    };

    // 手势行为
    $.fn.gesture = function (options) {
        var settings = $.extend(true, {}, defaults, options); // 从外部读取配置覆盖本程序配置
        var $this = settings.moveAble ? $(settings.moveAble) : $(this);
        var orgPoint = { "x": 0, "y": 0 }, newPoint = { "x": 0, "y": 0 }, touchAction = false, statSub, nowSub, lastRatio = 1, angelAB;

        window.initwidth = 1;

        var handlerOriginEvent = function (e) {
            var el = e.target ? e.target : e.srcElement;

            switch (e.type) {
                case "touchstart":
                case "mousedown":
                    // 记录初始坐标
                    orgPoint = $.s_com.getPoint(e, hasTouch);
                    newPoint = orgPoint;// 重置newpoint
                    __tapped = false;
                    // 初始化actionType的值
                    actionType = null;

                    // 避免重复执行
                    if (touchAction) return;
                    touchAction = true;

                    // 触摸开始的时间
                    startTime = Date.now();

                    // 是否要在touchstart的时候阻止默认行为,在传入的方法中指定
                    settings.touchstart ? settings.touchstart.call(this,e, orgPoint) : "";

                    // 按压
                    settings.press ? $.fn.press.call(this, e, orgPoint, newPoint, settings.press, { "holdTime": settings.holdTime }) : "";
                    break;
                case "touchmove":
                case "mousemove":
                    // 按压的情况下才有move
                    if (!touchAction) return;

                    // 多点触摸
                    if (hasTouch && $.fn.getFingers(e) > 1) {
                        // 多点触摸默认阻止默认行为
                        $.s_com.preventDefault(e);

                        if (window.initwidth) {
                            window.initwidth = 0;
                            // 获取初始两点坐标
                            statSub = $.s_com.getTwoPoint(e);
                            return true;
                        }

                        // 缩放操作
                        nowSub = $.s_com.getTwoPoint(e);

                        // 根据两点决定的斜率来区分是旋转还是缩放
                        // 旋转原理
                        // 以x轴为y轴,y轴为x轴,因为canvas是的x轴向右,y轴向下.传统的(y2-y1)/(x2-x1)是斜率正切函数tanθ,这里用(x2-x1)/(y2-y1)来等效于传统的正切
                        // 在四个象限中,新正切值愈大则表示用户是在左旋操作,新正切值愈小则表示用户在进行右旋图片操作                    
                        angelAB = (getAngle(nowSub) - getAngle(statSub));

                        if (((angelAB > 1 && angelAB < 30) || angelAB < -80)) {
                            // 两点连成的直线竖直的时候从90度(旧点)旋转到-90度(新点)(-80-80=-160,这里取的-80作为这种情况以容错)
                            // 右旋 
                            actionType = "rotateR";

                            settings.rotateR ? settings.rotateR.call(this,e, statSub, nowSub) : "";

                            // 用新的替换旧的两点坐标值以满足可以迅速左右旋转
                            statSub = nowSub;
                        } else if ((angelAB < -1 || angelAB > 50)) {
                            // 两点连成的直线竖直的时候从-80度(旧点)旋转到80度(新点)(80-(-80)=160)
                            // 左旋
                            actionType = "rotateL";
                            settings.rotateL ? settings.rotateL.call(this,e, statSub, nowSub) : "";

                            // 用新的替换旧的两点坐标值以满足可以迅速左右旋转
                            statSub = nowSub;

                        } else {
                            // 缩放
                            actionType = "zoom";

                            /// 缩放原理：
                            /// 手指放上去的时候的距离 > 双指移动后的距离便是缩小
                            /// 手指放上去的时候的距离 < 双指移动后的距离便是放大
                            // 控制最大缩放比防止操作区域太小
                            zoomRatio = nowSub.zValue / statSub.zValue > 2 ? 2 : nowSub.zValue / statSub.zValue;
                            zoomRatio = zoomRatio < 0.75 ? 0.75 : zoomRatio;

                            settings.zoom ? settings.zoom.call(this,e, statSub, nowSub, zoomRatio) : "";
                            statSub = nowSub;
                        }
                    } else {
                        /// 在这里做点击和移动的判断

                        // 单点移动操作0
                        // 记录新坐标
                        newPoint = $.s_com.getPoint(e);

                        actionType = "move";

                        // 移动元素和滑动元素的区别是:是否存在传入方法
                        if (settings.drag) {
                            // 移动                                
                            settings.drag.call(this,e, orgPoint, newPoint);
                        }

                        // 上滑,下滑,左划,右划
                        if (settings.swipe) {
                            actionType = "swipe";
                            $.fn.swipe.call(this,e, orgPoint, newPoint, settings.swipe);
                        }
                    }

                    break;
                case "touchend":
                case "touchcancel":
                case "mouseup":
                case "mouseout":
                    window.initwidth = 1;
                    // 没有touch/mousedown的end/up/out不执行
                    if (!touchAction) return;

                    // 点击更新
                    // (0923更新日志:)如果没有配置这个事件就不执行.否则会出现嵌套问题:父级节点绑定，字节点也绑定了gesture,点击子节点，父级节点也会执行                                              
                    settings.tap ? $.fn.tap.call(this, e, orgPoint, newPoint, settings.tap, { "doubleTap": settings.doubleTap, "maxDoubleTapInterval": settings.maxDoubleTapInterval, "tapTime": settings.tapTime, "tapMaxDistance": settings.tapMaxDistance, "holdTime": settings.holdTime }) : "";

                    // (2015/11/18修复按压bug)没有满足按压条件的时间,就取消按压事件(清除定时器便可)
                    var endTime = Date.now() - startTime;
                    endTime < settings.holdTime ? clearTimeout(__pressTimer) : "";

                    if (settings.end) {
                        switch (actionType) {
                            case "zoom":
                            case "rotateR":
                            case "rotateL":
                                settings.end.call(this,e, statSub, nowSub);
                                break;
                            default:
                                settings.end.call(this,e, orgPoint, newPoint)
                                break;
                        }
                    }

                    touchAction = false;
                    break;
            }
        };

        //init gesture
        bindingEvents.split(" ").forEach(function (evt) {
            // 2015/10/16增加多个html对象绑定事件,之前是一次只能绑定一个元素
            $this.each(function (i) {
                $this[i][evt] = {};
                $this[i][evt].listeners = function(evt){
                    handlerOriginEvent.call($this.eq(i),evt);
                };

                // 2017年1月3日更新:为了可以解绑事件绑定 !($this[i]["on" + evt]) ? $this[i].addEventListener(evt,$this[i][evt].listeners,false) : ($this[i]["on" + evt] = $this[i][evt].listeners);
                $this[i].addEventListener(evt,$this[i][evt].listeners,false);
            });
        });
        // 强制重绘解决浏览器假死
        // $.s_com.reforceFlow();
    };
    // set the default options of msnvisualcue functionality
    $.fn.gesture.defaults = defaults;

    // 手势事件的释放
    $.fn.gestureDispose = function (options) {
        var settings = $.extend(true, {}, defaults, options); // 从外部读取配置覆盖本程序配置
        var $this = settings.moveAble ? $(settings.moveAble) : $(this);

        bindingEvents.split(" ").forEach(function (evt) {
            $this.each(function (i) {
                // 2017年1月3日更新:为了可以解绑事件绑定 !($this[i]["on" + evt]) ? $this[i][evt] && $this[i].removeEventListener(evt,$this[i][evt].listeners,false) : ($this[i]["on" + evt] = null);
                $this[i][evt] && $this[i].removeEventListener(evt,$this[i][evt].listeners,false)
            });
        });
    };
})(jQuery);
