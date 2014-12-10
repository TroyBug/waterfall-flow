(function($) {
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

    var getCoords = function (elem) {
        var box = elem.getBoundingClientRect(),
            doc = elem.ownerDocument,
            body = doc.body,
            html = doc.documentElement,
            clientTop = html.clientTop || body.clientTop || 0,
            clientLeft = html.clientLeft || body.clientLeft || 0,
            top = box.top + (self.pageYOffset || html.scrollTop || body.scrollTop) - clientTop,
            left = box.left + (self.pageXOffset || html.scrollLeft || body.scrollLeft) - clientLeft;
        return { 'top': top, 'left': left };
    };

    var move = function (options) {
        options = options || {};

        var defaults = {
            target:options.target || null,
            buffer:options.buffer || 5, //��ֵԽ�ߣ��˶�Խ��
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
            //����ceil��floor���ܸ㷴�������ͱ�֤�ٶ���СΪ1����-1���㷴�˻����speedΪ0��������¶������ܼ���
            speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);

            if(current == distance) {
                clearTimeout(t);
                callback && callback();
            } else {
                style[prop] = current + speed + 'px';
                t = setTimeout(arguments.callee,10);
            }
        })();
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

    $.fn.waterfall = function() {
        var d = document,
            dd = d.documentElement,
            db = d.body,
            //ÿ��ͼƬ������ռ���
            itemW = 240,
            //ͼƬ���
            imgW = 230,
            //ͼƬ�������
            margin = 10,
            container = this[0];

        this.append($('<ul></ul>'));
        this.after('<div id="loading" class="loading"><img src="/images/load.gif" alt=""></div>');

        var waterfallBox = this.find('ul')[0],
            loading = $('#loading')[0];

        var waterfall = {
            //��ȡ����
            getColumn:function() {
                //�Ӵ����
                var w = dd.clientWidth,
                //��������
                    column = w / (itemW + margin) >> 0;

                column = Math.min(column,6);
                column = Math.max(column,3);

                return column;
            },
            //��ʼҳ��
            p:0,
            //����ÿһ�еĸ߶�
            cHeight:[],
            //������������ֹ����û�����ʱҳ��͹��������·���һ�η����µ�����
            lock:false,
            //ҳ�������ɺ���������
            init:function() {
                if(waterfall.lock) return;
                //����
                waterfall.lock = !waterfall.lock;
                //��ʾ�ײ������ڼ���ͼ��
                loading.style.display = 'block';

                $.ajax({
                    url:'/api/waterfall?page='+waterfall.p,
                    type:'GET',
                    'dataType':'json',
                    success:function(data) {
                        //var data = typeof JSON === 'undefined' ? eval('('+data+')') : JSON.parse(data);
                        //�����ص�����
                        waterfall.handleData(data);
                        //���Լ���ͼƬ
                        waterfall.lazyLoad();
                        //�ص���ɣ�����
                        waterfall.lock = !waterfall.lock;
                        //�������ڼ���ͼ��
                        loading.style.display = 'none';
                        //���Ե�ʱ���ֵ�9ҳ��һ�ų�����ͼƬ������ͼƬ�������߶���Ȼ���ܳ�������ͼƬ��
                        //ҳ��ײ��հ�һƬ�����������б�Ҫ�ټ��һ���Ƿ�Ӧ��������һ��ͼƬ
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
                //���������ͼƬ�߶�
                    oHeight,
                //li��leftֵ
                    liLeft,
                //li��topֵ
                    liTop;


                for(i = 0; i < len; i++) {
                    if(i < cells && waterfall.p == 0) {//���iС�����������ǵ�һҳ��˵���ǵ�һ��
                        //���������ͼƬ�߶ȣ���Ϊ�ӿڷ��ص�ͼƬ�߶��п�����ԭʼ��С����Ҫѹ��һ��
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
                        //��ȡ�������и߶���С��һ�е�ֵ
                        var minH = Math.min.apply(null,waterfall.cHeight);
                        //index�����ֵ���ڵ��е����(��0��ʼ)
                        var index = waterfall.cHeight.getIndex(minH);
                        //ͼƬ����
                        oHeight = parseInt(itemW * data[i].height / data[i].width);
                        //��ǰli��leftֵ
                        liLeft = realWidth * index;
                        //��ǰli��topֵ
                        liTop = minH + margin;

                        //����li�����������left,topֵ��λ
                        var li = d.createElement('li');
                        li.style.left = liLeft + 'px';
                        li.style.top = liTop + 'px';

                        //createHTML��������li�������
                        html = waterfall.createHTML(data,i,oHeight);
                        //����li
                        li.innerHTML = html;

                        //׷�ӽ��б�
                        waterfallBox.appendChild(li);
                        //������һ�еĸ߶ȣ�ע��Ҫ����margin
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
            //�������뵽��̵�һ�к�ʼ������һҳ����
            scrollAndLoad:function() {
                //������������룬chrome�µ�document.documentElement.scrollTop��0��������document.body.scrollTop����
                var sTop = db.scrollTop ? db.scrollTop : dd.scrollTop;

                //��������С�߶�
                var minH = Math.min.apply(null,waterfall.cHeight);

                //�������������͵�ǰ�Ӵ��߶�֮��
                var sum = sTop + dd.clientHeight;
                //˵������������̵�һ�У���ʱӦ��Ӧ�ý�����һ��������
                if(sum >= minH) {
                    //����ҲҪ�Ӹ���������ҳ����Ծ������
                    if(waterfall.lock) return;
                    //��һҳ
                    waterfall.p++;
                    waterfall.init();
                }
                waterfall.lazyLoad();
            },
            //ͼƬ���Լ���
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
                             * @param o {object} ͼƬ����
                             * @param url {string} ͼƬ��ַ
                             * @param w {Number} ���
                             * @param h {Number} �߶�
                             */
                            image.onload = (function(o,url,w,h) {
                                //���ִ���ʽ������IE 7 8 ���ⱨ��δʵ�ֵĴ���
                                return function() {
                                    waterfall.handleWhenLoad(o,url,w,h)
                                }
                            })(img,attr,width,height);

                            image.src = attr;
                        }
                    }
                }
            },
            //ͼƬ���������һϵ����������
            handleWhenLoad:function(o,url,w,h) {
                //��һ������Ҫ���Ȱ�src��Ϊ�գ������ٸ�ֵ��ȥ���������־޴��loadingͼ��
                o.setAttribute('src','');
                o.setAttribute('src',url);
                //�Ƴ�data_url����
                o.removeAttribute('data_url');
                o.setAttribute('width',w);
                o.setAttribute('height',h);
                o.removeAttribute('data_width');
                o.removeAttribute('data_height');
                //removeAttribute IE 7 8 ��ʧЧ���������油�������className
                o.removeAttribute('class');
                o.className = '';
            },
            //ҳ������ʱ���¶�λ����Ԫ��
            resizeWindow:function() {
                //���»�ȡ����
                var cells = waterfall.getColumn(),
                //��ȡ����liԪ��
                    items = waterfallBox.getElementsByTagName('li'),
                    i = 0,
                    len = items.length,
                    item,
                    height,
                    realWidth = itemW + margin,
                    minH,
                    index;
                //���ñ���ÿ�и߶ȵ�����
                waterfall.cHeight = [];

                for(; i < len; i++) {
                    item = items[i];
                    height = item.offsetHeight;
                    if(i < cells) {
                        move({target:item,distance:i*realWidth});
                        move({target:item,prop:'top',distance:0});

                        //item.style.left = i * realWidth + 'px';
                        //item.style.top = 0;
                        //�����и߶ȷŽ�����
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
                //���ź�����ͼƬ�Ժ󿴿��ǲ�����Ҫ������һҳͼƬ
                waterfall.scrollAndLoad();
                //���Ҷ��Լ���ͼƬ
                waterfall.lazyLoad();

                container.style.width = parseInt(cells * realWidth) - margin + 'px';
                container.style.height = Math.max.apply(null,waterfall.cHeight) + 'px';
            }
        };

        $(window).bind('load',waterfall.init);
        $(window).bind('scroll',waterfall.scrollAndLoad);
        $(window).bind('resize',function() {
            waitForFinalEvent(waterfall.resizeWindow,500);
        });

        return this;
    };
})(jQuery);

$('#container').waterfall();
