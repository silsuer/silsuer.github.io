---
layout:     post
title:      "参考Laravel制作基于golang的路由包"
author:     "silsuer"
header-img: "img/post-yu.jpg"
---



## 概述

最近在开发自己的 Web 框架 [Bingo](https://github.com/silsuer/bingo), 也查看了一些市面上的路由工具包，但是都有些无法满足我的需求，

例如，我希望获得一些 `Laravel` 框架的特性:

 - 快速的路由查找

 - 动态路由支持

 - 中间件支持

 - 路由组支持

而市面上最快的就是 `httprouter` ，这里本来几个月前我改造过一次: [改造httprouter使其可以支持中间件](http://silsuer.cn/2018/04/19/bingo-httprouter/)，但是那时是耦合在`bingo`框架中的,并且中间件不支持拦截，在这里我需要将其抽出来制作出一个第三方包，可以直接引用，无需依赖 `Bingo` 框架

所以我依旧选用了 `httprouter` 作为基础包，将其进行改造，使其支持以上特性。

仓库地址: [bingo-router](https://github.com/silsuer/bingo-router)

用法在项目的 `README` 中已经将的很清楚了，这里不再赘述，有问题或者有什么需求可以给我提 `issue` 喔~

也建议先过一遍 `README.md` 再看这篇文章，不然可能会有地方看不懂...

改造主要分为两部分

1. 第一部分是将 `httprouter` 的 路由树`tree`上挂载的 `handle`方法改为我们自定义的结构体

`httprouter` 的原理可以看这篇 [5.2 router 请求路由](https://books.studygolang.com/advanced-go-programming-book/ch5-web/ch5-02-router.html)

简单来讲，就是把所有接口的路径，共同构造一颗前缀树，将前缀相同的路径放在一棵树杈中，这样可以加速查找速度，而每片树叶都代表查找到了一个路由方法，挂载的就是一个方法，

但是这样的话这棵前缀树上就只能挂载 方法了，无法添加一些额外信息，所以第一步就要让前缀树上挂载一个我们自定义的结构体，让我们可以查找到挂载的中间件、路由 前缀等

2. 第二部分是实现中间件功能，如果只是 遍历操作一个中间件数组，那么无法进行一些拦截操作，

   比如，我们要实现一个中间件用来验证用户是否登陆 ，未登录用户将会返回错误信息，那么如果遍历执行一个中间件数组，最终还是将会执行到最终的路由

   为了实现拦截功能，我参考了 `Laravel`中的 `Pipeline` 功能的实现原理，实现了一个管道对象，实现上述效果

## 开始改造

### 1. 第一部分

  1. 在我们的计划中，计划实现 路由组、中间件、路由前缀功能，所以我们需要自定义的结构体如下:

  ```go

    // 路由
    type Route struct {
    	path         string             // 路径
	    targetMethod TargetHandle       // 要执行的方法
	    method       string             // 访问类型 是get post 或者其他
	    name         string             // 路由名
	    mount        []*Route           // 子路由
	    middleware   []MiddlewareHandle // 挂载的中间件
	    prefix       string             // 路由前缀，该前缀仅对子路由有效
    }

  ```

  其中的 `targetMethod` 就是原本挂载在前缀树的`handle` 方法了，我们需要把原本  `tree.go` 文件中的 `Node` 结构体上挂载的 `handle` 方法全部 改为 `Route`,

  改动较大，且没有什么需要特别注意的 ，就不在这里赘述了，具体可以看 `tree.go` 文件

  2. 在 `README` 中的路由注册操作，使用的是责任链模式，每个方法最后都返回一个当前对象的指针，就可以实现链式操作

     其中的 `Get``Post` 等方法，实际上是在向`Route`对象中的属性赋值，没什么技术含量，感兴趣可以看[源码](https://github.com/silsuer/bingo-router/blob/master/route.go)

  3. 实现路由组功能

     通过路由组，我们可以给子路由设置公共的前缀和中间件，`Laravel` 中是让路由成组来做的，多个路由组成了一个组对象，而这里 ，我直接用了子路由的方式，将组对象也变成了一个普通路由，组对象下
     的路由就是当前路由的子路由

     写一个`Mount()` 方法，让路由添加子路由：

     ```go
       // 挂载子路由，这里只是将回调中的路由放入
       func (r *Route) Mount(rr func(b *Builder)) *Route {
       	builder := new(Builder)
       	rr(builder)
       	// 遍历这个路由下建立的所有子路由，将路由放入父路由上
       	for _, route := range builder.routes {
       		r.mount = append(r.mount, route)
       	}
       	return r
       }
     ```

     其中的 `Builder` 中包含了一个路由数组，通过建造者模式，给`Builder`一个 `NewRoute` 方法，让每一个通过这种方法创建的路由都在`Builder`的`routes`属性下:

     ```
       func (b *Builder) NewRoute() *Route {
       	r := NewRoute()
       	b.routes = append(b.routes, r)
       	return r
       }
     ```

     在创建的时候将指针放入 `Builder` 中即可

     这样，我们所建立的多个路由 就可以嵌套在一起了，那么如何利用 `httprouter` 的 `Handle` 方法，将我们的 `Route` 对象，注入到`Router` 中呢？

  4. 将路由注入路由器

    从 `httprouter` 源码可以看出，无论是 `Get`,`Post`还是其他的方法，最终都是调用了 `router.Handle()` 方法，传入访问方式，路径，和对应的方法，我们刚刚已经把对应的方法改为了路由

    所以这里就传入 访问方式，路径，和路由对象，并且在注入的时候，让中间件和路由前缀等都生效

    编写一个注入的方法`Mount`:

    ```go

      var prefix []string // 当前路由前缀，每经过一层，前缀就会增加一个，最终将数组中的字符串连接起来就是最后的前缀了
      var middlewares map[string][]MiddlewareHandle  // 中间件，key标识了这是第几层路由的中间件，值就是对应的中间件数组了
      var currentPointer int // 当前是第几层路由

      // 挂载方法可以一次性传入多个路由对象
      func (r *Router) Mount(routes ...*Route) {
      	prefix = []string{}
      	middlewares = make(map[string][]MiddlewareHandle)
      	for _, route := range routes {
      	    // 挂载单个路由
      		r.MountRoute(route)
      	}

      }


    // 向其中挂载路由
    func (r *Router) MountRoute(route *Route) {

        // 将当前路径的中间件放入集合中
        setMiddlewares(currentPointer, route)

        // 当前路径是所有前缀数组连接在一起，加上当前路由的path
        p := getPrefix(currentPointer) + route.path

        // 如果一个路由设置了前缀，则这个前缀会作用在所有的子路由上
        prefix = append(prefix, route.prefix)


        if route.method != "" && p != "" {
            r.Handle(route.method, p, route)  // 路由有效，注入路由器 Router中
        }

        // 如果路由有子路由，则将子路由挂载进去，如果没有，
        if len(route.mount) > 0 {
            for _, subRoute := range route.mount {
                currentPointer += 1 // 添加一层，进入下一层路由
                r.MountRoute(subRoute)
            }
        } else {
            if currentPointer > 0 {
                currentPointer -= 1 // 减小一层，退回上一层路由
            }
        }

    }

    // 根据当前是第几层路由，获取前缀
    func getPrefix(current int) string {
        if len(prefix) > current-1 && len(prefix) != 0 {
            return strings.Join(prefix[:current], "")
        }
        return ""
    }

    // 设置中间件，根据当前是第x层路由，将前面的路由放入当前路由中
    func setMiddlewares(current int, route *Route) {
        key := "p" + strconv.Itoa(currentPointer)
        for _, v := range route.middleware {
            middlewares[key] = append(middlewares[key], v)
        }

        // 将当前路由的父路由的都放入当前路由中
        for i := 0; i < currentPointer; i++ {
            key = "p" + strconv.Itoa(i)
            if list, ok := middlewares[key]; ok {
                for _, v := range list {
                    route.middleware = append(route.middleware, v)
                }
            }
        }
    }
    ```
   首先定义全局变量 :

    - `prefix` 记录每层路由的前缀，键就是路由层数，值就是路由前缀

    - `middlewares` 记录每层路由中间件，键可以标识路由层数，值就是该层中间件的所有集合

    - `currentPointer` 标识当前处在第几层路由，通过它从上面的两个变量中取出属于当前路由层的数据

    然后每遍历一次，就把对应前缀和中间件组存入全局变量中，递归调用，再取出合适的数据，最终执行 `Handle` 方法注入路由器中

    上面只是简略的介绍了一下如何制作，具体可以直接看代码，没有难点。

### 2. 第二部分


    我们构建的`server`,都要实现`ServeHttp` 方法，这样当请求进来的时候，就会走到我们定义的这个方法中，原本的 `httprouter` 所定义的`ServeHttp`可以在[这里](https://github.com/julienschmidt/httprouter/blob/master/router.go)看到

    过程就是将当前的`URL`,沿着前缀树寻找树叶，找到后直接执行，而我们上面将树叶更改成了`Route`结构体，这样当寻找到的时候，需要先执行它的中间件，再执行它的 `targetMethod`方法

    而这里的中间件，我们不能直接使用 `for` 循环去遍历执行，因为这样不能拦截请求，最终都会走到`targetMethod`中，并且没有后置效果，那么如何制作这种功能呢？

    `laravel` 中用到了一种 `Pipeline` 的方法，也就是管道，让每一个 `context` 顺序经过每一个中间件，如果被拦截，则不往下传递

    具体思路可以看[这里](https://laravel-china.org/articles/2769/laravel-pipeline-realization-of-the-principle-of-single-component)

    我实现的源码在[这里](https://github.com/silsuer/bingo-router/blob/master/pipeline.go)

    下面使用代码实现:

    我们期待的效果是这样:

    ```go
      	// 建立管道，执行中间件最终到达路由
      	new(Pipeline).Send(context).Through(route.middleware).Then(func(context *Context) {
      	    route.targetMethod(context)
      	})
    ```

    首先建立一个管道结构体:

    ```
      type Pipeline struct {
      	send    *Context           // 穿过管道的上下文
      	through []MiddlewareHandle // 中间件数组
      	current int                // 当前执行到第几个中间件
      }
    ```

    `Send()`,`Through()` 方法都是向其中注入内容的，这里就不多说了

    主要是 `Then` 方法:

    ```
      // 这里是路由的最后一站
      func (p *Pipeline) Then(then func(context *Context)) {
      	// 按照顺序执行
      	// 将then作为最后一站的中间件
      	var m MiddlewareHandle
      	m = func(c *Context, next func(c *Context)) {
      		then(c)
      		next(c)
      	}
      	p.through = append(p.through, m)
      	p.Exec()
      }

    ```

    `then` 方法将最终要执行的那个方法也封装成了一个中间件，加入了管道的最后，然后执行 `Exec` 方法，开始从头让 `send` 中的对象穿过管道:


    ```go

    func (p *Pipeline) Exec() {
        if len(p.through) > p.current {
            m := p.through[p.current]
            p.current += 1
            m(p.send, func(c *Context) {
                p.Exec()
            })
        }

    }
    ```

    取出当前指针指向的那个中间件，将当前指针移动到下一个中间件，并且执行刚刚取出的中间件，在其中传入的回调`next`,就是递归执行这个逻辑，执行下一个中间件，

    这样在我们的代码中就可以通过 `next()` 方法的位置，来控制是前置中间件还是后置中间件了

    代码不多，但是实现的效果很有趣，感谢 `Laravel`


> 我只是重写了一部分他人的东西，感谢开源，受益匪浅，另外 挂一下自己的 web 框架 [Bingo](https://github.com/silsuer/bingo) ,求 star，欢迎 PR！