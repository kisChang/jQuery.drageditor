/**
 * jQuery Draggable plugin
 * @version 0.1
 * @author kischang
 */
;(function ($, window, undefined) {
    //#region 拖拽元素类
    function DragElement(node) {
        this.target = $(node);
    }
    DragElement.prototype = {
        constructor: DragElement,
        setXY: function (x, y) {
            this.x = parseInt(x) || 1;
            this.y = parseInt(y) || 1;
            return this;
        },
        setTargetCss: function (css) {
            $(this.target).css(css);
            return this;
        }
    }
    //#endregion

    //#region 鼠标元素
    function Mouse() {
        this.x = 1;
        this.y = 1;
    }
    Mouse.prototype.setXY = function (x, y) {
        this.x = parseInt(x);
        this.y = parseInt(y);
    }
    //#endregion

    //拖拽配置
    var draggableConfig;
    var draggableConfigDef = {
        dragElement: null,
        dragDom: null,
        settings: null,
        targetType: true,
        targetDom: null,
        endFuncall: null,
        mouse: new Mouse()
    };

    var draggableStyle = {
        dragging: {
            cursor: "move"
        },
        defaults: {
            cursor: "default"
        }
    }

    var $document = $(document);
    var mousePos;
    $document.bind('mousemove', function (ev) {
        mousePos = mousePosition(ev || window.event);
    }).bind('selectstart', function (ev) {
        ev.stopPropagation();
        return false;
    });
    function mousePosition(ev){
        if(ev.pageX || ev.pageY){
            return {x:ev.pageX, y:ev.pageY};
        }
        return {
            x:ev.clientX + document.body.scrollLeft - document.body.clientLeft,
            y:ev.clientY + document.body.scrollTop - document.body.clientTop
        };
    }

    //判断鼠标是否在dom的范围
    function isMouseOnDom(dom, mousePos) {
        var domPos = getDomOffset(dom);
        if (mousePos.x > domPos.right || mousePos.x < domPos.left){
            return false;
        }
        if (mousePos.y > domPos.bottom || mousePos.y < domPos.top){
            return false;
        }
        return true;
    }
    //获取dom的相对位置信息
    function getDomOffset(dom, offset){
        dom = $(dom);
        offset = offset === undefined ? dom.offset() : offset;
        return {
            top : offset.top,
            bottom: offset.top + dom.height(),
            left: offset.left,
            right : offset.left + dom.width()
        }
    }

    /**
     * 拖动插件函数入口
     * @param $ele      初始化dom
     * @param options   参数
     */
    function drag($ele, options) {
        var defaults = {
            dragSel : null,     //可拖动的对象选择器
            dragSelOn : true,   //true 用on， false 用 delegate
            dragCss : '',       //拖动后Clone的对象 增加的css
            target: {           //对象未定义或是select 为null 都是随意摆放
                select: null,   //目标选择器（null 可随意摆放）
                targetType:true,//true目标内随意摆放   false容器内摆放
                css: '',        //目标高亮css
                tarSelCss: '',  //目标被选中的高亮css
                dragOkCss: '',  //被拖动可放置的高亮css
            },
            clone: false,       //true 创建对象拖动，false 直接拖动当前对象
            onClone: null,      //如果是Clone，则调用该方法处理一次div
            onStart: function(event){},     //当拖动开始
            onEnd: function(event){},       //拖动结束
        };
        var settings = $.extend(true, {}, defaults, options);
        draggableConfig = $.extend(true, {}, draggableConfigDef);

        //绑定拖动事件
        $document.mousemove(move).mouseleave(endMove).mouseup(endMove);

        //当前被拖动的对象
        var $dragDiv;
        //拖动到的目标对象
        var $targetDiv;
        //被拖动对象的父对象
        var $dragNode;
        if (settings.dragSel === null){
            $dragNode = $ele;
            $dragNode.on({"mousedown": onDragStart});
        }else {
            if (settings.dragSelOn){
                $ele.find(settings.dragSel).on("mousedown", onDragStart);
            }else {
                $ele.delegate(settings.dragSel, "mousedown", onDragStart);
            }
        }
        //拖动事件
        function onDragStart(event) {
            //创建被拖动的div
            var $tmpDrag = $(this);
            //禁用选择
            if(document.attachEvent) {//ie的事件监听，拖拽div时禁止选中内容，firefox与chrome已在css中设置过-moz-user-select: none; -webkit-user-select: none;
                $tmpDrag[0].attachEvent('onselectstart', function() {
                    return false;
                });
            }
            //禁止图片拖动
            $tmpDrag.find('img').bind('dragstart', function () {return false;});

            if (settings.clone){
                //Clone 对象
                $tmpDrag = $($tmpDrag.clone(false));
                var whTmp = {width: $(this).width(), height: $(this).height()};
                //调用函数处理
                if (settings.onClone){
                    $tmpDrag = $(settings.onClone($tmpDrag, whTmp));
                }else {
                    $tmpDrag.css(whTmp);
                }
            }
            $tmpDrag.addClass(settings.dragCss);
            $tmpDrag.css({
                position: "fixed", zIndex: 99999,
                top: event.clientY, left: event.clientX,
            });
            //插入Clone的对象
            if (settings.clone){
                $tmpDrag.insertAfter($(this));
            }

            //调用onStart
            ( settings.onStart && settings.onStart({
                div: $tmpDrag, parent: $(this), mouseEvent: event
            }) );

            //初始化相关事件绑定
            $tmpDrag.on({
                "mouseup": endFun,
                "mouseover": function () {
                    $(this).css(draggableStyle.dragging);
                },
                "mouseout": function () {
                    $(this).css(draggableStyle.defaults);
                },
            });

            //初始化拖动对象
            var dragElement = draggableConfig.dragElement = new DragElement($tmpDrag);
            $dragDiv = $(dragElement.target);
            draggableConfig.dragDom = $tmpDrag;
            draggableConfig.settings = settings;
            //初始化目标控件
            if (settings.target.select !== null){
                //target 范围
                draggableConfig.targetDom = $(settings.target.select);
            }

            draggableConfig.mouse.setXY(event.clientX, event.clientY);
            //xy 对象 默认在点击的位置
            var xy = {
                x: $dragDiv.position().left,
                y: $dragDiv.position().top
            };
            //可以对位置进行一次处理
            draggableConfig.dragElement.setXY(xy.x, xy.y);
            function endFun(event) {
                if($dragDiv !== null) $dragDiv.removeClass(settings.dragCss);
                //取消绑定的事件
                $tmpDrag.unbind('mouseup');
                $tmpDrag.unbind('mouseout');
                $tmpDrag.unbind('mouseover');
                $tmpDrag.css(draggableStyle.defaults);
                //移动DOM树
                if (draggableConfig.targetDom !== null){
                    if (draggableConfig.settings.target.targetType){
                        //简单的从原位置，剪切到当前位置
                        $(draggableConfig.targetDom).append($tmpDrag.clone());
                        $tmpDrag.remove();
                    }else {
                        //直接移至选中的目标的dom树
                        var tarDom = draggableConfig.targetDomNow;
                        if(tarDom !== null && tarDom !== undefined){
                            var cloneTmp = $tmpDrag.clone();
                            //清除所有css
                            cloneTmp.css({width: 'auto', height: 'auto', position: null, opacity: 1, 'z-index': null, cursor: 'default'});
                            tarDom.append(cloneTmp);
                        }
                        draggableConfig.targetDom.removeClass(draggableConfig.settings.target.tarSelCss);
                        $tmpDrag.remove();
                    }
                }

                //程序初始化
                draggableConfig = $.extend(true, {}, draggableConfigDef);

                //调用handler
                ( settings.onEnd && settings.onEnd({
                    div: $tmpDrag, parent: $(this), mouseEvent: event, target: $targetDiv
                }) );
            }
            draggableConfig.endFuncall = endFun;

            //调用一次move
            move(event);
        }
    }

    function endMove(){
        if(draggableConfig !== undefined && typeof draggableConfig.endFuncall === 'function'){
            draggableConfig.endFuncall();
        }
    }

    function move(event) {
        if (draggableConfig.dragElement && draggableConfig.settings !== null) {
            var mouse = draggableConfig.mouse,
                dragElement = draggableConfig.dragElement;
            var left = parseInt(event.clientX - mouse.x + dragElement.x);
            var top = parseInt(event.clientY - mouse.y + dragElement.y);
            //target 处理
            if (draggableConfig.targetDom !== null && draggableConfig.targetDom.length > 0){
                if (draggableConfig.settings.target.targetType){
                    //true目标内随意摆放
                    var tarOffset = getDomOffset(draggableConfig.targetDom);
                    var destDragDiv = getDomOffset(draggableConfig.dragDom, {top: top, left: left});
                    if(destDragDiv.left < tarOffset.left){
                        left = tarOffset.left;
                    }
                    if(destDragDiv.right > tarOffset.right){
                        left = tarOffset.right - draggableConfig.dragDom.width();
                    }
                    if(destDragDiv.top  < tarOffset.top){
                        top = tarOffset.top;
                    }
                    if(destDragDiv.bottom > tarOffset.bottom){
                        top = tarOffset.bottom - draggableConfig.dragDom.height();
                    }
                }else {
                    //false容器内存放（固定位置）
                    draggableConfig.targetDom.removeClass(draggableConfig.settings.target.tarSelCss);
                    draggableConfig.targetDomNow = null;
                    for(var i = 0;i <draggableConfig.targetDom.length;i++){
                        var tmp = $(draggableConfig.targetDom[i]);
                        if (isMouseOnDom(tmp, mousePos)){
                            //高亮当前可进入的容器
                            tmp.addClass(draggableConfig.settings.target.tarSelCss);
                            draggableConfig.targetDomNow = tmp;
                        }
                    }
                }
            }
            dragElement.setTargetCss({"left": left + "px", "top": top + "px"});
        }
    }

    //注册到jQuery
    $.fn.kisDrag = function (options) {
        drag(this, options);
    }

})(jQuery, window, undefined);