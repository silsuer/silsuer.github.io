---
layout:     post
title:      "TWIG源码解析"
author:     "silsuer"
header-img: "img/post-yanyu.jpg"
---

# TWIG 源码解析

## Twig简介

  Twig是php世界里最快的模版引擎，可以快速将模版编译为html代码
  
  
## 运行流程

 1. 首先要建立一个加载器 `loader`：
 
    ```php
       // 传入模版根目录
       $loader = new Twig_Loader_Filesystem('/path/to/templates');
    ```
 2. 依据根目录建立环境变量:
 
    ```
       // 传入我们建立的加载器和其他配置
       $twig = new Twig_Environment($loader, array(
           'cache' => '/path/to/compilation_cache',
       ));

    ```
    
 3. 从环境变量中载入模版
 
   ```
      $template = $twig->load('index.html');
   ```
   
 4. 渲染模版
 
   ```
      echo $template->render(array('the' => 'variables', 'go' => 'here'));
   ```
   
### 运行状态解析

建立加载器和环境变量的过程其实不必多说，只是载入配置，使模版拥有一个载体，主要是加载模版和渲染的过程

1. 加载模版

  - 解析成token流
  
   `twig`会将模版文件代码首先解析成token流，所谓token流，实际上就是将模版引擎通过左右定界符和规定好的语义，
   切成一个链表，例如如下模版：
   
   ```
      <!DOCTYPE html>
      <html>
      <head>
          <title>My Webpage</title>
      </head>
      <body>
      <ul id="navigation">
          {% for item in navigation %}
          <li><a href="{{ item.href }}">{{ item.caption }}</a></li>
          {% endfor %}
      </ul>
      
      <h1>My Webpage</h1>
      {{ a_variable }}
      </body>
      </html>
   ``` 
   
   将会分割成如下token流：
   
   ```
      Twig_TokenStream {#1680 ▼
        -tokens: array:29 [▼
          0 => Twig_Token {#1651 ▼
            -value: """
              <!DOCTYPE html>\n
              <html>\n
              <head>\n
                  <title>My Webpage</title>\n
              </head>\n
              <body>\n
              <ul id="navigation">\n
                  
              """
            -type: 0
            -lineno: 1
          }
          1 => Twig_Token {#1652 ▼
            -value: ""
            -type: 1
            -lineno: 8
          }
          2 => Twig_Token {#1653 ▼
            -value: "for"
            -type: 5
            -lineno: 8
          }
          3 => Twig_Token {#1654 ▼
            -value: "item"
            -type: 5
            -lineno: 8
          }
          4 => Twig_Token {#1655 ▼
            -value: "in"
            -type: 8
            -lineno: 8
          }
          5 => Twig_Token {#1656 ▼
            -value: "navigation"
            -type: 5
            -lineno: 8
          }
          6 => Twig_Token {#1657 ▼
            -value: ""
            -type: 3
            -lineno: 8
          }
          7 => Twig_Token {#1658 ▼
            -value: "    <li><a href=""
            -type: 0
            -lineno: 9
          }
          8 => Twig_Token {#1659 ▼
            -value: ""
            -type: 2
            -lineno: 9
          }
          9 => Twig_Token {#1660 ▼
            -value: "item"
            -type: 5
            -lineno: 9
          }
          10 => Twig_Token {#1661 ▼
            -value: "."
            -type: 9
            -lineno: 9
          }
          11 => Twig_Token {#1662 ▼
            -value: "href"
            -type: 5
            -lineno: 9
          }
          12 => Twig_Token {#1663 ▼
            -value: ""
            -type: 4
            -lineno: 9
          }
          13 => Twig_Token {#1664 ▼
            -value: "">"
            -type: 0
            -lineno: 9
          }
          14 => Twig_Token {#1665 ▼
            -value: ""
            -type: 2
            -lineno: 9
          }
          15 => Twig_Token {#1666 ▼
            -value: "item"
            -type: 5
            -lineno: 9
          }
          16 => Twig_Token {#1667 ▼
            -value: "."
            -type: 9
            -lineno: 9
          }
          17 => Twig_Token {#1668 ▼
            -value: "caption"
            -type: 5
            -lineno: 9
          }
          18 => Twig_Token {#1669 ▼
            -value: ""
            -type: 4
            -lineno: 9
          }
          19 => Twig_Token {#1670 ▼
            -value: """
              </a></li>\n
                  
              """
            -type: 0
            -lineno: 9
          }
          20 => Twig_Token {#1671 ▼
            -value: ""
            -type: 1
            -lineno: 10
          }
          21 => Twig_Token {#1672 ▼
            -value: "endfor"
            -type: 5
            -lineno: 10
          }
          22 => Twig_Token {#1673 ▼
            -value: ""
            -type: 3
            -lineno: 10
          }
          23 => Twig_Token {#1674 ▼
            -value: """
              </ul>\n
              \n
              <h1>My Webpage</h1>\n
              """
            -type: 0
            -lineno: 11
          }
          24 => Twig_Token {#1675 ▼
            -value: ""
            -type: 2
            -lineno: 14
          }
          25 => Twig_Token {#1676 ▼
            -value: "a_variable"
            -type: 5
            -lineno: 14
          }
          26 => Twig_Token {#1677 ▼
            -value: ""
            -type: 4
            -lineno: 14
          }
          27 => Twig_Token {#1678 ▼
            -value: """
              \n
              </body>\n
              </html>
              """
            -type: 0
            -lineno: 14
          }
          28 => Twig_Token {#1679 ▼
            -value: ""
            -type: -1
            -lineno: 14
          }
        ]
        -current: 0
        -source: Twig_Source {#1578 ▼
          -code: """
            <!DOCTYPE html>\n
            <html>\n
            <head>\n
                <title>My Webpage</title>\n
            </head>\n
            <body>\n
            <ul id="navigation">\n
                {% for item in navigation %}\n
                <li><a href="{{ item.href }}">{{ item.caption }}</a></li>\n
                {% endfor %}\n
            </ul>\n
            \n
            <h1>My Webpage</h1>\n
            {{ a_variable }}\n
            </body>\n
            </html>
            """
          -name: "a.html"
          -path: "/Users/silsuer/code/twig-test/public/a.html"
        }
      }
   ```
   
   可以看到，每个token的结构都包含：`value`,`type`,`lineno`
   
   值和行号不必多说，就是对应模版中的部分，主要是type的区分:
   
   ```
       const EOF_TYPE = -1;                  // 模版末尾
       const TEXT_TYPE = 0;                  // 文本（不在左右定界符之间）
       const BLOCK_START_TYPE = 1;           // 块语句开始
       const VAR_START_TYPE = 2;             // 变量语句   
       const BLOCK_END_TYPE = 3;             // 块语句结束
       const VAR_END_TYPE = 4;               // 变量语句结束
       const NAME_TYPE = 5;                  // 名称类型(有可能是变量名、标记名、函数名等)
       const NUMBER_TYPE = 6;                // 数字类型
       const STRING_TYPE = 7;                // 字符串类型
       const OPERATOR_TYPE = 8;              // 操作符
       const PUNCTUATION_TYPE = 9;           // 标点（例如 item.href中的点号） 
       const INTERPOLATION_START_TYPE = 10;  // 插值类型开始
       const INTERPOLATION_END_TYPE = 11;    // 插值类型结束

   ```
   
   我们解析模版的时候需要依赖这些类型
   
  - 分析token流（词法分析）
  
     
   
   
   