import React, {useState, useEffect} from 'react'
import {over} from 'stompjs'
import SockJS from 'sockjs-client'

var stompClient = null

function ChatRoom() {
    const [publicChats, setPublicChats] = useState({})
    const [privateChats, setPrivateChats] = useState(new Map())
    const [tab, setTab] = useState("CHATROOM")
    const [userData, setUserData] = useState(
        {
            username:"",
            recievername:"",
            connected:false,
            message:""
        }
    )

    function handleValue(event)
    {
        const {value, name} = event.target
        setUserData({...userData, [name]:value})
    }

    function registerUser()
    {
        let Sock = new SockJS("http://localhost:8080/ws")
        stompClient = over(Sock)
        stompClient.connect({}, onConnected, onError)
    }

    function sendPublicMessage()
    {
        if(stompClient)
        {
            let chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status: 'MESSAGE'
            }
            stompClient.send('/app/message', {}, JSON.stringify(chatMessage))
            setUserData({...userData, "message":""})
        }
    }

    function sendPrivateMessage()
    {
        if(stompClient)
        {
            let chatMessage = {
                senderName: userData.username,
                recievername: tab,
                message: userData.message,
                status: 'MESSAGE'
            }
            if(userData.username !== tab)
            {
                privateChats.set(tab).push(chatMessage)
                setPrivateChats(new Map(privateChats))
            }
            stompClient.send('/app/private-message', {}, JSON.stringify(chatMessage))
            setUserData({...userData, "message":""})
        }
    }

    function onConnected()
    {
        setUserData({...userData, "connected":true})
        stompClient.subscribe('/chatroom/public', onPublicMessageReceived)
        stompClient.subscribe('/user/'+userData.username+'/private', onPrivateMessageReceived)
        userJoin()
    }

    function userJoin()
    {
        let chatMessage = {
            senderName: userData.username,
            status: 'JOIN'
        }
        stompClient.send('/app/message', {}, JSON.stringify(chatMessage))
    }


    function onPublicMessageReceived(payload)
    {
        let payloadData = JSON.parse(payload.body)
        switch(payloadData.status)
        {
            case "JOIN":
                if(!privateChats.get(payloadData.senderName))
                    privateChats.set(payloadData.senderName, [])
                    setPrivateChats(new Map(privateChats))
                break
            case "MESSAGE":
                publicChats.push(payloadData)
                setPublicChats({...publicChats})
                break
        }
    }

    function onPrivateMessageReceived(payload)
    {
        let payloadData = JSON.parse(payload)
        if(privateChats.get(payloadData.senderName))
        {
            privateChats.get(payloadData.senderName).push(payloadData)
            setPrivateChats(new Map(privateChats))
        }
        else
        {
            let list = []
            list.push(payloadData)
            privateChats.set(payloadData.senderName, list)
            setPrivateChats(new Map(privateChats))
        }
    }

    function onError(err)
    {
        console.log(err)
    }

  return (
    <div className='container'>
        {userData.connected?
            <div className='chat-box'>
                <div className='member-list'>
                    <ul>
                        <li onClick={() => {setTab("CHATROOM")}} className={`member ${tab === "CHATROOM" && "active"}`}>Chatroom</li>
                        {[...privateChats.keys()].map((name, index) =>
                        (
                            <li onClick={() => {setTab("name")}} className={`member ${tab === "CHATROOM" && "active"}`} key={index}>
                                {name}
                            </li>
                        ))}
                    </ul>
                </div>
                {tab === "CHAROOM" && <div className='chat-content'>
                    <ul className='chat-messages'>
                        {publicChats.map((chat, index) =>
                        (
                            <li className='message' key={index}>
                                {chat.senderName !== userData.username && <div className='avatar'>{chat.senderName}</div>}
                                <div className='message-data'>{chat.message}</div>
                                {chat.senderName === userData.username && <div className='avatar self'>{chat.senderName}</div>}
                            </li>
                        ))}
                    </ul>
                    <div className='send-message'>
                        <input type='text' name='message' className='input-message' placeholder='Enter public message' value={userData.message} onChange={handleValue}/>
                        <button type='button' className='send-button' onClick={sendPublicMessage}>Send</button>
                    </div>
                </div>}
                {tab !== "CHAROOM" && <div className='chat-content'>
                    <ul className='chat-messages'>
                        {[...privateChats.get(tab)].map((chat, index) =>
                        (
                            <li className='message' key={index}>
                                {chat.senderName !== userData.username && <div className='avatar'>{chat.senderName}</div>}
                                <div className='message-data'>{chat.message}</div>
                                {chat.senderName === userData.username && <div className='avatar self'>{chat.senderName}</div>}
                            </li>
                        ))}
                    </ul>
                    <div className='send-message'>
                            <input type='text' name='message' className='input-message' placeholder={`Enter private message for ${tab}`} value={userData.message} onChange={handleValue}/>
                            <button type='button' className='send-button' onClick={sendPrivateMessage}>Send</button>
                        </div>
                    </div>}
            </div>
            :
            <div className='register'>
                <input id='user-name' name='username' placeholder='Enter user name' value={userData.username} onChange={handleValue}/>
                <button type='button' onClick={registerUser}>Connect</button>
            </div>
        }
    </div>
  )
}

export default ChatRoom