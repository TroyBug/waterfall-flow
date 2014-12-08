var http = {
	createXHR:function() {//创建XMLHttpRequest对象
		var xhr = null;
		try{
			xhr = new XMLHttpRequest();
		} catch(e) {
			var i,activeXids = ['MSXML2.XMLHTTP.3.0','MSXML2.XMLHTTP','Microsoft.XMLHTTP'];
			for(i = 0; i < activeXids.length; i++) {
				try {
					xhr = new ActiveXObj(activeXids[i]);
				} catch(e){}
			}
		}
		this.createXHR = function() {//重写该函数避免多次创建XMLHttpRequest对象
			return xhr;
		};
		return xhr;
	},
	handler:function(xhr,callback) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			callback && callback(xhr.responseText || xhr.responseXML);
		}
	},
	/**
	 * @param options.type {string} 'GET','POST','PUT','DELETE' 
	 * @param options.url {string} a url
	 * @param options.async {boolean} is async or not
	 * @param options.callback {function} callback when request done
	 */
	ajax:function(options) {
		var options = options || {},
			type = options.type || 'GET',
			url = options.url || '',
			async = options.async || true,
			xhr = this.createXHR(),
			callback = options.callback,
			that = this;

		xhr.onreadystatechange = function() {
			//交给handler函数处理
			that.handler(xhr,callback);
		};
		if(url != '') {//如果url有效才进行异步请求
			xhr.open(type,url,async);
			xhr.send(null);
		} else {//否则抛出异常
			throw new Error('need url parameter');
		}
	}
};

if(!Array.prototype.getIndex) {
	Array.prototype.getIndex = function(n) {
		for(var i = 0,len = this.length; i < len; i++) {
			if(this[i] === n) {
				return i;
			}
		}

		return null;
	}
}

/**
 * @param el {object} 需要添加事件的元素
 * @param type {string} 事件类型
 * @param handler {function} 事件句柄
 */
function addEvent(el,type,handler) {
	if(el.addEventListener) {
		el.addEventListener(type,handler,false);
		addEvent = function(el,type,handler) {
			el.addEventListener(type,handler,false);
		};
	} else if(el.attachEvent) {
		el.attachEvent('on'+type,handler);
		addEvent = function(el,type,handler) {
			el.attachEvent('on'+type,handler);
		};
	} else {
		el['on'+type] = handler;
		addEvent = function(el,type,handler) {
			el['on'+type] = handler;
		};
	}
}

function get(id) {
	return typeof id === 'string' ? document.getElementById(id) : id;
}

function getOffset(el) {
	var top = el.offsetTop,
		left = el.offsetLeft,
		parent = el.offsetParent;

	while(parent != null) {
		top += parent.offsetTop;
		left += parent.offsetLeft;
		parent = parent.offsetParent;
	}

	return {
		top:top,
		left:left
	};
}


/**
 * 图片头数据加载就绪事件 - 更快获取图片尺寸
 * @version  2011.05.27
 * @author  TangBin
 * @see    http://www.planeart.cn/?p=1121
 * @param  {String}  图片路径
 * @param  {Function}  尺寸就绪
 * @param  {Function}  加载完毕 (可选)
 * @param  {Function}  加载错误 (可选)
 * @example imgReady('http://www.google.com.hk/intl/zh-CN/images/logo_cn.png', function () {
    alert('size ready: width=' + this.width + '; height=' + this.height);
  });
 */
var imgReady = (function () {
  var list = [], intervalId = null,

  // 用来执行队列
  tick = function () {
    var i = 0;
    for (; i < list.length; i++) {
      list[i].end ? list.splice(i--, 1) : list[i]();
    };
    !list.length && stop();
  },

  // 停止所有定时器队列
  stop = function () {
    clearInterval(intervalId);
    intervalId = null;
  };

  return function (url, ready, load, error) {
    var onready, width, height, newWidth, newHeight,
      img = new Image();

    img.src = url;

    // 如果图片被缓存，则直接返回缓存数据
    if (img.complete) {
      ready.call(img);
      load && load.call(img);
      return;
    };

    width = img.width;
    height = img.height;

    // 加载错误后的事件
    img.onerror = function () {
      error && error.call(img);
      onready.end = true;
      img = img.onload = img.onerror = null;
    };

    // 图片尺寸就绪
    onready = function () {
      newWidth = img.width;
      newHeight = img.height;
      if (newWidth !== width || newHeight !== height ||
        // 如果图片已经在其他地方加载可使用面积检测
        newWidth * newHeight > 1024
      ) {
        ready.call(img);
        onready.end = true;
      };
    };
    onready();

    // 完全加载完毕的事件
    img.onload = function () {
      // onload在定时器时间差范围内可能比onready快
      // 这里进行检查并保证onready优先执行
      !onready.end && onready();

      load && load.call(img);

      // IE gif动画会循环执行onload，置空onload即可
      img = img.onload = img.onerror = null;
    };

    // 加入队列中定期执行
    if (!onready.end) {
      list.push(onready);
      // 无论何时只允许出现一个定时器，减少浏览器性能损耗
      if (intervalId === null) intervalId = setInterval(tick, 40);
    };
  };
})();


var whenReady = (function() {               //这个函数返回whenReady()函数
    var funcs = [];             //当获得事件时，要运行的函数
    var ready = false;          //当触发事件处理程序时,切换为true
    
    //当文档就绪时,调用事件处理程序
    function handler(e) {
        if(ready) return;       //确保事件处理程序只完整运行一次
        
        //如果发生onreadystatechange事件，但其状态不是complete的话,那么文档尚未准备好
        if(e.type === 'onreadystatechange' && document.readyState !== 'complete') {
            return;
        }
        
        //运行所有注册函数
        //注意每次都要计算funcs.length
        //以防这些函数的调用可能会导致注册更多的函数
        for(var i=0; i<funcs.length; i++) {
            funcs[i].call(document);
        }
        //事件处理函数完整执行,切换ready状态, 并移除所有函数
        ready = true;
        funcs = null;
    }
    //为接收到的任何事件注册处理程序
    if(document.addEventListener) {
        document.addEventListener('DOMContentLoaded', handler, false);
        document.addEventListener('readystatechange', handler, false);            //IE9+
        window.addEventListener('load', handler, false);
    }else if(document.attachEvent) {
        document.attachEvent('onreadystatechange', handler);
        window.attachEvent('onload', handler);
    }
    //返回whenReady()函数
    return function whenReady(fn) {
        if(ready) { fn.call(document); }
        else { funcs.push(fn); }
    }
})();

function move(options) {
    options = options || {};

    var defaults = {
        target:options.target || null,
        buffer:options.buffer || 5, //数值越高，运动越慢
        prop:options.prop || 'left',
        distance:options.distance || 0,
        callback:options.callback || null
    };

    for(var i in options) {
        if(options.hasOwnProperty(i)) {
            defaults[i] = options[i];
        }
    }
    if(!defaults.target) return;

    var tag = defaults.target;
    var style = tag.style;
    var prop = defaults.prop;
    var value = parseInt(defaults.target.style[prop]);  //0
    var buffer = defaults.buffer;
    var distance = defaults.distance;
    var callback = defaults.callback;

    var current,speed,t;
    
    (function() {
        current = parseInt(style[prop]);
        speed = (distance - current) / buffer ;
        //这里ceil和floor不能搞反，这样就保证速度最小为1或者-1，搞反了会出现speed为0的情况导致动画不能继续
        speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);

        if(current == distance) {
            clearTimeout(t);
            callback && callback();
        } else {
            style[prop] = current + speed + 'px';
            t = setTimeout(arguments.callee,10); 
        }
    })();
}

var waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout (timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();


function getCoords (elem) {
    var box = elem.getBoundingClientRect(),
        doc = elem.ownerDocument,
        body = doc.body,
        html = doc.documentElement,
        clientTop = html.clientTop || body.clientTop || 0,
        clientLeft = html.clientLeft || body.clientLeft || 0,
        top = box.top + (self.pageYOffset || html.scrollTop || body.scrollTop) - clientTop,
        left = box.left + (self.pageXOffset || html.scrollLeft || body.scrollLeft) - clientLeft;
    return { 'top': top, 'left': left };
}
