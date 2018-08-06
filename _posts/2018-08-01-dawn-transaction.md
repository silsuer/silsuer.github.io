---
layout:     post
title:      "区块链Transaction代码解析"
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - Go
---

## 交易记录

### 前言

[jeiwan](https://jeiwan.cc/posts/building-blockchain-in-go-part-4/)从头到尾的写出了
他所做的区块链的重点部分，当按照博客的方法实现的时候，发现有些方法并没有讲到，所以这里从最终实现之后的
效果来解析下代码

原理就不说了，博客中说的很清楚，只是有些代码没有提到

`main`函数代码：
   ```go
       func main() {
        cli := core.CLI{}
        cli.Run()
       }

   ```

### 命令

> ./Dawn createblockchain -address silsuer 创建一条区块链

当使用`createblockchain`这个命令时，将会走到`cli.go@Run` 方法中：

  1. `Run`方法首先使用  `cli.validateArgs()` 来验证参数是否正确（这里其实只是简单的判断下参数数量）
  
  2. 根据`createblockchain`标记，找到下面的 `switch`分支，跳到`cli.createBlockchain(*createBlockchainAddress)`
  方法，因为现在还没有实现公钥和私钥，所以 `address` 使用用户名来代替
  
  3. 创建区块链函数的具体代码为:
  
       ```go
    
          func CreateBlockchain(address string) *Blockchain {
            // 首先判断是否存在数据库文件，如果存在，可以代表已经存在区块链，直接提示区块链已经存在
            if dbExists() {
                fmt.Println("Blockchain already exists.")
                os.Exit(1)
            }
          
            // 这是个标记，永远代表当前区块链的最高区块的哈希值，方便从后往前查找
            var tip []byte
            
            // 打开一个数据库
            db, err := bolt.Open(dbFile, 0600, nil)
            
            if err != nil {
                log.Panic(err)
            }
          
            err = db.Update(func(tx *bolt.Tx) error {
                
                // 新建一个币基交易，这里是为了挖创世区块
                cbtx := NewCoinbaseTX(address, genesisCoinbaseData)
                
                // 创世区块，创建区块的时候都需要传递一个币基交易进去
                genesis := NewGenesisBlock(cbtx)
          
                // 数据持久化，将创世区块写入数据库
                b, err := tx.CreateBucket([]byte(blocksBucket))
                if err != nil {
                    log.Panic(err)
                }
          
                err = b.Put(genesis.Hash, genesis.Serialize())
                if err != nil {
                    log.Panic(err)
                }
          
                err = b.Put([]byte("l"), genesis.Hash)
                if err != nil {
                    log.Panic(err)
                }
                tip = genesis.Hash
          
                return nil
            })
          
            if err != nil {
                log.Panic(err)
            }
          
            // 实例化结构体
            bc := Blockchain{tip, db}
          
            // 返回地址
            return &bc
          }
       ```
  
       
       
   - 这里只有在创建创世区块的币基记录的时候才用到了地址，下面看看一笔币基交易是如何创建的：
   
      ```go
        // 第一个参数是这个币基交易要发送到的地址
        // 第二个参数是这个交易要携带的数据
        func NewCoinbaseTX(to, data string) *Transaction {
        	if data == "" {
        		data = fmt.Sprintf("Reward to '%s'", to)
        	}
        	// 输入记录
        	txin := TXInput{[]byte{}, -1, data}
        	// 输出记录
        	txout := TXOutput{subsidy, to}
        	// 创建交易
        	tx := Transaction{nil, []TXInput{txin}, []TXOutput{txout}}
        	
   	        // 给这笔交易设置一个唯一id
        	tx.SetID()
             // 返回交易地址
        	return &tx
        }
      ```
      
      博客中没有提到 `SetID` 方法，实际上跟区块一样，都是序列化之后使用 `sha256` 哈希得到的值作为ID
      

> ./Dawn getblance -address silsuer 获取账户余额

由于还没有实现公钥私钥，这里暂时使用用户名代替

   ```go

       func (cli *CLI) getBalance(address string) {
       // 首先根据传入的地址，打开区块链
       	bc := NewBlockchain(address)
       	defer bc.Db.Close()
       
       	balance := 0
       	// 然后获取这条链中的未花费余额
       	UTXOs := bc.FindUTXO(address)
       
       	// 相加后就是最终的余额
       	for _, out := range UTXOs {
       		balance += out.Value
       	}
       
       	fmt.Printf("Balance of '%s': %d\n", address, balance)
       }
   ```
   
   `NewBlockchain()`方法实际上就是打开当前的数据库（并没有用到地址）
   
   然后调用 `FindUTXO` 方法获取未花费余额:
   
   ```go
        func (bc *Blockchain) FindUTXO(address string) []TXOutput {
            var UTXOs []TXOutput
            unspentTransactions := bc.FindUnspentTransactions(address)
        
            for _, tx := range unspentTransactions {
                for _, out := range tx.Vout {
                    if out.CanBeUnlockedWith(address) {
                        UTXOs = append(UTXOs, out)
                    }
                }
            }
        
            return UTXOs
        }  
   ```
    
   
   一个方法一个方法的看：
    
   首先寻找含有未花费输出的所有交易记录
    
   ```go
       func (bc *Blockchain) FindUnspentTransactions(address string) []Transaction {
         var unspentTXs []Transaction  // 未花费记录的数组
         // 花费记录？
         spentTXOs := make(map[string][]int)
         bci := bc.Iterator()  // 生成一个区块链迭代器
       
         for {
           block := bci.Next()  
       
           // 遍历区块中的交易记录
           for _, tx := range block.Transactions {
           	// 将交易记录id转为字符串形式记录
             txID := hex.EncodeToString(tx.ID)
       
             // 输出
           Outputs: 
             for outIdx, out := range tx.Vout { // 遍历交易记录的输出
               // Was the output spent?
               if spentTXOs[txID] != nil {  // 如果在花费记录中存在
                 for _, spentOut := range spentTXOs[txID] { // 就遍历这个记录
                   if spentOut == outIdx { // 如果值和交易记录输出相同
                     continue Outputs
                   }
                 }
               }
       
               if out.CanBeUnlockedWith(address) {
                 unspentTXs = append(unspentTXs, *tx)
               }
             }
       
             if tx.IsCoinbase() == false {
               for _, in := range tx.Vin {
                 if in.CanUnlockOutputWith(address) {
                   inTxID := hex.EncodeToString(in.Txid)
                   spentTXOs[inTxID] = append(spentTXOs[inTxID], in.Vout)
                 }
               }
             }
           }
       
           if len(block.PrevBlockHash) == 0 {
             break
           }
         }
       
         return unspentTXs
       }
   ```
   
   这里的方法在博客中提到了，这里不再赘述，实际上就是遍历了整个区块链，现将包含未花费输出的交易取出来
   
   然后遍历这些交易，将输出相加就是最终的余额
   
   也是因为这个特性，如果每次都要遍历整个区块链，性能将变得十分慢，所以又出现了较小的UTXO模型，
   
   当然，UTXO模型当增大到一定程度之后也将出现性能问题，所以以太坊使用的是账户模型，以后再进行讨论。
   
> 其余的就是send命令了，博客讲的很详细。


   
   



 
