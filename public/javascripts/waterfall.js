(function() {
    var d = document,
        dd = d.documentElement,
        db = d.body,
        //每个图片容器所占宽度
        itemW = 240,
        //图片宽度
        imgW = 230,
        //图片容器间距
        margin = 10,
        waterfallBox = get('waterfall'),
        container = get('container'),
        loading = get('loading');

    var waterfall = {
        //获取列数
        getColumn:function() {
            //视窗宽度
            var w = dd.clientWidth,
                //计算列数
                column = w / (itemW + margin) >> 0;

            column = Math.min(column,6);
            column = Math.max(column,3);

            return column;
        },
        //初始页数
        p:0,
        //保存每一列的高度
        cHeight:[],
        //加锁，用来防止请求没有完成时页面就滚动到最下方再一次发起新的请求
        lock:false,
        //页面加载完成后立即运行
        init:function() {
            if(waterfall.lock) return;
            //加锁
            waterfall.lock = !waterfall.lock;
            //显示底部的正在加载图标
            loading.style.display = 'block';

            http.ajax({
                url:'/api/waterfall?page='+waterfall.p,
                type:'GET',
                callback:function(data) {
                    var data = typeof JSON === 'undefined' ? eval('('+data+')') : JSON.parse(data);
                    //处理返回的数据        
                    waterfall.handleData(data);
                    //惰性加载图片
                    waterfall.lazyLoad();
                    //回调完成，解锁
                    waterfall.lock = !waterfall.lock;
                    //隐藏正在加载图标
                    loading.style.display = 'none';
                    //测试的时候发现第9页有一张超长的图片，其余图片加载完后高度仍然不能超过这张图片，
                    //页面底部空白一片，所以这里有必要再检测一次是否应该再请求一组图片
                    waterfall.scrollAndLoad();
                }
            });
        },
        handleData:function(data) {
            var i,
                len = data.length,
                cells = waterfall.getColumn(),
                html = '',
                realWidth = itemW + margin,
                //按比例算出图片高度
                oHeight,
                //li的left值
                liLeft,
                //li的top值
                liTop;


            for(i = 0; i < len; i++) {
                if(i < cells && waterfall.p == 0) {//如果i小于列数并且是第一页，说明是第一行
                    //按比例算出图片高度，因为接口返回的图片高度有可能是原始大小，需要压缩一下
                    oHeight = parseInt(itemW * data[i].height / data[i].width);
                    liLeft = realWidth * i;
                    var li = d.createElement('li');
                    li.style.left = liLeft + 'px';
                    li.style.top = 0;

                    html = waterfall.createHTML(data,i,oHeight);
                    li.innerHTML = html;

                    waterfallBox.appendChild(li);                        
                    waterfall.cHeight.push(li.offsetHeight);
                } else {
                    //获取所有列中高度最小的一列的值
                    var minH = Math.min.apply(null,waterfall.cHeight);
                    //index是这个值所在的列的序号(从0开始)
                    var index = waterfall.cHeight.getIndex(minH);
                    //图片比例
                    oHeight = parseInt(itemW * data[i].height / data[i].width);
                    //当前li的left值
                    liLeft = realWidth * index;
                    //当前li的top值
                    liTop = minH + margin; 

                    //创建li并根据算出的left,top值定位
                    var li = d.createElement('li');
                    li.style.left = liLeft + 'px';
                    li.style.top = liTop + 'px';

                    //createHTML方法生成li里的内容
                    html = waterfall.createHTML(data,i,oHeight);
                    //填充进li
                    li.innerHTML = html;

                    //追加进列表
                    waterfallBox.appendChild(li);
                    //更新这一列的高度，注意要算上margin
                    waterfall.cHeight[index] += li.offsetHeight + margin;
                }
            }

            container.style.width = parseInt(cells * realWidth) - margin + 'px';
            container.style.height = Math.max.apply(null,waterfall.cHeight) + 'px';

        },
        createHTML:function(data,i,height) {
            var html = '<div style="width:'+imgW+'px; height:'+height+'px">' +
                            '<a target="_blank" href="'+data[i].url+'">' +
                                '<img class="default" data_width="'+imgW+'" data_height="'+height+'" src="/images/load.gif" data_url="/api/getImage?url='+ data[i].url+'" alt="'+unescape(data[i].title)+'">' +
                            '</a>' +
                        '</div>' +
                        '<p><a href="'+data[i].url+'" target="_blank">'+ (data[i].title == '' ? '......' : unescape(data[i].title))+'</a></p>';

            return html;
        },
        //滚动距离到最短的一列后开始加载下一页数据
        scrollAndLoad:function() {
            //浏览器滚动距离，chrome下的document.documentElement.scrollTop是0，所以用document.body.scrollTop代替
            var sTop = db.scrollTop ? db.scrollTop : dd.scrollTop;

            //数组中最小高度
            var minH = Math.min.apply(null,waterfall.cHeight);

            //浏览器滚动距离和当前视窗高度之和
            var sum = sTop + dd.clientHeight;
            //说明滚动到了最短的一列，此时应该应该进行另一次请求了
            if(sum >= minH) {
                //这里也要加个锁，避免页码跳跃性增加
                if(waterfall.lock) return;
                //下一页
                waterfall.p++;
                waterfall.init();
            }
            waterfall.lazyLoad();
        },
        //图片惰性加载
        lazyLoad:function() {
            var allItems = d.getElementsByTagName('li'),
                len = allItems.length,
                i = 0,
                splice = Array.prototype.splice,
                sTop = db.scrollTop ? db.scrollTop : dd.scrollTop,
                sum = sTop + dd.clientHeight;

            for(; i < len; i++) {
                var img = allItems[i].getElementsByTagName('img')[0];
                var attr = img.getAttribute('data_url');
                var width = img.getAttribute('data_width');
                var height = img.getAttribute('data_height');
                var liTop = getCoords(allItems[i]).top;
                if(attr) {
                    if(sum >= liTop) {
                        var image = new Image();
                        
                        /**
                         * @param o {object} 图片对象
                         * @param url {string} 图片地址
                         * @param w {Number} 宽度
                         * @param h {Number} 高度
                         */
                        image.onload = (function(o,url,w,h) {
                            //这种处理方式可以让IE 7 8 避免报尚未实现的错误
                            return function() {
                                waterfall.handleWhenLoad(o,url,w,h)
                            }
                        })(img,attr,width,height);

                        image.src = attr;
                    }
                }
            }
        },
        //图片就绪后进行一系列属性设置
        handleWhenLoad:function(o,url,w,h) {
            //这一步很重要，先把src置为空，后面再赋值回去，否则会出现巨大的loading图标
            o.setAttribute('src','');
            o.setAttribute('src',url);
            //移除data_url属性
            o.removeAttribute('data_url');
            o.setAttribute('width',w);
            o.setAttribute('height',h);
            o.removeAttribute('data_width');
            o.removeAttribute('data_height');
            //removeAttribute IE 7 8 会失效，所以下面补充了清空className
            o.removeAttribute('class');
            o.className = '';
        },
        //页面缩放时重新定位各个元素
        resizeWindow:function() {
            //重新获取列数
            var cells = waterfall.getColumn(),
            //获取所有li元素
                items = waterfallBox.getElementsByTagName('li'),
                i = 0,
                len = items.length,
                item,
                height,
                realWidth = itemW + margin,
                minH,
                index;
            //重置保存每列高度的数组
            waterfall.cHeight = [];

            for(; i < len; i++) {
                item = items[i];
                height = item.offsetHeight;
                if(i < cells) {
                    move({target:item,distance:i*realWidth});
                    move({target:item,prop:'top',distance:0});
                    
                    //item.style.left = i * realWidth + 'px';
                    //item.style.top = 0;
                    //将各列高度放进数组
                    waterfall.cHeight.push(height);
                } else {
                    minH = Math.min.apply(null,waterfall.cHeight);
                    index = waterfall.cHeight.getIndex(minH);

                    move({target:item,distance:index * realWidth});
                    move({target:item,prop:'top',distance:minH + margin});

                    //item.style.left = index * realWidth + 'px';
                    //item.style.top = minH + margin + 'px';

                    waterfall.cHeight[index] += item.offsetHeight + margin;
                }
            }
            //重排好所有图片以后看看是不是需要加载下一页图片
            waterfall.scrollAndLoad();
            //并且惰性加载图片
            waterfall.lazyLoad();

            container.style.width = parseInt(cells * realWidth) - margin + 'px';
            container.style.height = Math.max.apply(null,waterfall.cHeight) + 'px';
        }
    };

    addEvent(window,'load',waterfall.init);
    addEvent(window,'scroll',waterfall.scrollAndLoad);
    addEvent(window,'resize',function() {
        waitForFinalEvent(waterfall.resizeWindow,150);
    });
})();