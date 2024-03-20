import React from "react";
import { Button } from "antd";

//本地视频
let localVideo;

//本地流
let localStream;
//PeerA连接对象
let peerConnA;

/**
 * 连接建立示例
 */
class Server extends React.Component {

    componentDidMount() {
        //初始化本地视频对象
        localVideo = this.refs['localVideo'];


        //获取本地视频尺寸
        localVideo.addEventListener('loadedmetadata', () => {
            console.log(`本地视频尺寸为: videoWidth: ${localVideo.videoWidth}px,  videoHeight: ${localVideo.videoHeight}px`);
        });
    }

    //开机
    camera = async () => {
        console.log('开始获取本地媒体流');
        try {
            //获取音视频流
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            console.log('获取本地媒体流成功');
            //本地视频获取流
            localVideo.srcObject = stream;
            localStream = stream;
        } catch (e) {
            console.log("getUserMedia错误:" + e);
        }
    }

    //推流
    push = async () => {
        console.log('开始推流...');
        //视频轨道
        const videoTracks = localStream.getVideoTracks();
        //音频轨道
        const audioTracks = localStream.getAudioTracks();
        //判断视频轨道是否有值
        if (videoTracks.length > 0) {
            //输出摄像头的名称
            console.log(`使用的视频设备为: ${videoTracks[0].label}`);
        }
        //判断音频轨道是否有值
        if (audioTracks.length > 0) {
            //输出麦克风的名称
            console.log(`使用的音频设备为: ${audioTracks[0].label}`);
        }

        //设置ICE Server,使用Google服务器
        let configuration = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };

        //创建RTCPeerConnection对象
        peerConnA = new RTCPeerConnection(configuration);
        console.log('创建本地PeerConnection成功:peerConnA');
        //监听返回的Candidate信息
        peerConnA.addEventListener('icecandidate', this.onIceCandidateA);

        //监听ICE状态变化
        peerConnA.addEventListener('iceconnectionstatechange', this.onIceStateChangeA);





        //循环迭代本地流的所有轨道
        localStream.getTracks().forEach((track) => {
            //把音视频轨道添加到连接里去
            peerConnA.addTrack(track, localStream);
        });
        console.log('将本地流添加到peerConnA里');

        try {
            console.log('peerConnA创建提议Offer开始');
            //创建提议Offer
            const offer = await peerConnA.createOffer();
            //创建Offer成功
            await this.onCreateOfferSuccess(offer);
        } catch (e) {
            //创建Offer失败
            this.onCreateSessionDescriptionError(e);
        }
    }

    //创建会话描述错误
    onCreateSessionDescriptionError = (error) => {
        console.log(`创建会话描述SD错误: ${error.toString()}`);
    }

    //创建提议Offer成功
    onCreateOfferSuccess = async (desc) => {
        //peerConnA创建Offer返回的SDP信息
        console.log(`peerConnA创建Offer返回的SDP信息\n${desc.sdp}`);
        console.log('设置peerConnA的本地描述start');
        try {
            //设置peerConnA的本地描述
            await peerConnA.setLocalDescription(desc);
            this.onSetLocalSuccess(peerConnA);
        } catch (e) {
            this.onSetSessionDescriptionError();
        }
    }

    //设置本地描述完成
    onSetLocalSuccess = (pc) => {
        console.log(`${this.getName(pc)}设置本地描述完成:setLocalDescription`);
    }


    //设置描述SD错误
    onSetSessionDescriptionError = (error) => {
        console.log(`设置描述SD错误: ${error.toString()}`);
    }

    getName = (pc) => {
        return (pc === peerConnA) ? 'peerConnA' : 'peerConnB';
    }



    //创建应答成功
    onCreateAnswerSuccess = async (desc) => {
        //输出SDP信息
        console.log(`peerConnB的应答Answer数据:\n${desc.sdp}`);
        console.log('peerConnB设置本地描述开始:setLocalDescription');
        try {
            //设置peerConnB的本地描述信息
            await peerConnB.setLocalDescription(desc);
            this.onSetLocalSuccess(peerConnB);
        } catch (e) {
            this.onSetSessionDescriptionError(e);
        }
        console.log('peerConnA设置远端描述开始:setRemoteDescription');
        try {
            //设置peerConnA的远端描述,即peerConnB的应答信息
            await peerConnA.setRemoteDescription(desc);
            this.onSetRemoteSuccess(peerConnA);
        } catch (e) {
            this.onSetSessionDescriptionError(e);
        }
    }

    //Candidate事件回调方法
    onIceCandidateA = async (event) => {
        try {
            if (event.candidate) {
                //将会peerConnA的Candidate添加至peerConnB里
                await peerConnB.addIceCandidate(event.candidate);
                this.onAddIceCandidateSuccess(peerConnB);
            }
        } catch (e) {
            this.onAddIceCandidateError(peerConnB, e);
        }
        console.log(`IceCandidate数据:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    }



    //添加Candidate成功
    onAddIceCandidateSuccess = (pc) => {
        console.log(`${this.getName(pc)}添加IceCandidate成功`);
    }

    //添加Candidate失败
    onAddIceCandidateError = (pc, error) => {
        console.log(`${this.getName(pc)}添加IceCandidate失败: ${error.toString()}`);
    }

    //监听ICE状态变化事件回调方法
    onIceStateChangeA = (event) => {
        console.log(`peerConnA连接的ICE状态: ${peerConnA.iceConnectionState}`);
        console.log('ICE状态改变事件: ', event);
    }



    //断开连接
    hangup = () => {
        console.log('结束会话');
        //关闭peerConnA
        peerConnA.close();

        //peerConnA置为空
        peerConnA = null;

    }

    render() {
        return (
            <div className="container">
                <h1>
                    <span>Server示例</span>
                </h1>
                {/* 本地视频 */}
                <video ref="localVideo" playsInline autoPlay muted></video>
                <div>
                    <Button ret="Camera" onClick={this.camera} style={{ marginRight: "10px" }}>开机</Button>
                    <Button ref="pushButton" onClick={this.push} style={{ marginRight: "10px" }}>推流</Button>
                    <Button ref="hangupButton" onClick={this.hangup} style={{ marginRight: "10px" }}>挂断</Button>
                </div>
            </div>
        );
    }
}
//导出组件
export default Server;
