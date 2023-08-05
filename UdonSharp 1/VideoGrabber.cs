
using UdonSharp;
using UnityEngine;
using VRC.SDK3.Components;
using VRC.SDK3.Components.Video;
using VRC.SDK3.Video.Components;
using System;
using System.Collections.Generic;
using VRC.SDK3.Video.Components.AVPro;
using VRC.SDK3.Video.Components.Base;
using VRC.SDKBase;
using VRC.Udon;
using UnityEngine.UI;

public class VideoGrabber : UdonSharpBehaviour
{
    //public VRCUnityVideoPlayer player;

    public VRCUrlInputField input;
    public Text inputText;

    public UdonBehaviour cNetworkManager;

    public MagicDeck deck;

    public Transform[] fakeDecks;
    private int deckLocation;
    private bool swapLocation = true;
//in case I need a decksheet
//http://localhost:8080/lightning_bolt/birds_of_paradise/swamp/mountain/island/forest/plains/lightning_bolt/birds_of_paradise/swamp/mountain/island/forest/plains/lightning_bolt/birds_of_paradise/swamp/mountain/island/forest/plains/lightning_bolt/birds_of_paradise/swamp/mountain/island/forest/plains/lightning_bolt/birds_of_paradise/swamp/mountain/island/forest/plains
    void Update()
    {
        if(swapLocation)
        {
            float closest = 999;
            for(int i = 0; i < fakeDecks.Length; i++)
            {
                if(Vector3.Distance(fakeDecks[i].position, Networking.LocalPlayer.GetPosition()) < closest)
                {
                    deckLocation = i;
                    this.transform.parent.position = fakeDecks[i].position;
                    this.transform.parent.rotation = fakeDecks[i].rotation;
                    closest = Vector3.Distance(fakeDecks[i].position, Networking.LocalPlayer.GetPosition());
                }
            }
        }
    }
    public void PlayURL()
    {
        swapLocation = false;
        for(int i = 0; i < this.transform.childCount; i++)
        {
            this.transform.GetChild(i).gameObject.SetActive(false);
        }
        Networking.SetOwner(Networking.LocalPlayer, cNetworkManager.gameObject);
        cNetworkManager.SendCustomEvent("startSerialize");
        this.SendCustomEventDelayedSeconds("playNetworkedVideo", 0.3f);
        this.SendCustomEventDelayedSeconds("getDeckFromURL", 14f);
    }
    public void playNetworkedVideo()
    {
        cNetworkManager.SendCustomEvent("setDeckURLS");
        cNetworkManager.SetProgramVariable<VRCUrl>("inputURL", input.GetUrl());
        cNetworkManager.SendCustomEvent("syncLoad");
        cNetworkManager.SendCustomEvent("startSerialize");
        /*        
        cNetworkManager.SetProgramVariable<VRCUrl>("inputURL", input.GetUrl());
        cNetworkManager.SendCustomEvent("setDeckURLS");
        cNetworkManager.SendCustomEvent("syncLoad");
        */
    }
    public void getDeckFromURL()
    {
        if(deckLocation==0)
        {
            deck.transform.position = new Vector3(-0.325f, 0.979f, 2.132f);
            deck.transform.rotation = Quaternion.Euler(0,180,0);
        }
        else if(deckLocation==1)
        {
            deck.transform.position = new Vector3(0.563f, 0.979f, 2.296f);
            deck.transform.rotation = Quaternion.Euler(0,90,0);
        }
        else if(deckLocation==2)
        {
            deck.transform.position = new Vector3(0.336f, 0.979f, 3.2526f);
            deck.transform.rotation = Quaternion.Euler(0,0,0);
        }
        else if(deckLocation==3)
        {
            deck.transform.position = new Vector3(-0.554f, 0.979f, 3.094f);
            deck.transform.rotation = Quaternion.Euler(0,-90,0);
        }
        string inputT = inputText.text.Substring(24);

        string[] cardNames;
        string curString = "";
        int decksize = 0;



        for(int i=0; i<inputT.Length; i++)
        {
            if(inputT[i] == '\n')
            {
                decksize++;
            }
        }
        cardNames = new string[decksize];
        int lastUsedIndex = 0;
        for(int i=0; i<inputT.Length; i++)
        {
            if(inputT[i] == '\n')
            {
                cardNames[lastUsedIndex] = curString;
                lastUsedIndex++;
                curString = "";
            }
            else
            {
                curString+=inputT[i];
            }
        }
        deck.generateDeck(cardNames);
        this.gameObject.SetActive(false);
    }
}
