
using UdonSharp;
using UnityEngine;
using VRC.SDKBase;
using VRC.SDK3.Video.Components;
using VRC.Udon;
using System;

public class networkManager : UdonSharpBehaviour
{
    public VRCUnityVideoPlayer[] videoPlayers;
    [UdonSynced]
    public VRCUrl inputURL;
    private VRCUrl pastInputURL;
    [UdonSynced]
    public int takenPool;
    [UdonSynced]
    public int[] takenPools = {-1,-1,-1,-1};
    public int ourPool = -1;    

    public override void OnDeserialization()
    {
        syncLoad();
    }
    public void setDeckURLS()
    {
        for(int i = 0; i < takenPools.Length; i++)
        {
            if(takenPools[i] == -1)
            {
                takenPools[i] = Networking.LocalPlayer.playerId;
                takenPool = i;
                ourPool = i;
                i = takenPools.Length;
            }
        }
    }
    public void syncLoad()
    {
        if(pastInputURL!=inputURL)
        {
            pastInputURL = inputURL;
            videoPlayers[takenPool].PlayURL(inputURL);
        }
    }
    public void startSerialize()
    {
        RequestSerialization();
    }
}

/*
using UdonSharp;
using UnityEngine;
using VRC.SDKBase;
using VRC.SDK3.Video.Components;
using VRC.Udon;
using System;

public class networkManager : UdonSharpBehaviour
{

    public VRCUrl inputURl = new VRCUrl("http://localhost:8080/+dl");
    [UdonSynced]
    public int[] takenPools = {-1,-1,-1,-1};
    public int[] pastTakenPools = {-1,-1,-1,-1};
    public int ourPool = -1;    
    private VRCUrl copyVideo = new VRCUrl("http://localhost:8080/+dl");

    public override void OnDeserialization()
    {
        syncLoad();
    }
    public void setDeckURLS()
    {
        for(int i = 0; i < takenPools.Length; i++)
        {
            if(takenPools[i] == -1)
            {
                takenPools[i] = Networking.LocalPlayer.playerId;
                //takenPool = i;
                ourPool = i;
                i = takenPools.Length;
            }
        }
    }
    public void syncLoad()
    {
        for(int i = 0; i < takenPools.Length; i++)
        {
            if(takenPools[i] != pastTakenPools[i])
            {
                pastTakenPools[i] = takenPools[i];
                if(inputURl != copyVideo)
                {
                    videoPlayers[i].PlayURL(inputURl);
                    inputURl = copyVideo;
                }
                else
                {
                    Debug.Log("Playing +dl video");
                    videoPlayers[i].PlayURL(copyVideo);  
                }
            }
        }
    }
}*/

