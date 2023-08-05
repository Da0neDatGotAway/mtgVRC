
using UdonSharp;
using UnityEngine;
using System;
using VRC.SDK3.Video.Components;
using VRC.SDK3.Components;
using VRC.SDKBase;
using VRC.Udon;
using UnityEngine.UI;

public class MagicDeck : UdonSharpBehaviour
{
    public Transform[] poolHolders;
    public Transform[] magicCards;
    private bool[] usedCard;
    public UdonBehaviour networkManager;
    public Transform baseMenu;
    public Transform putBackMenu;
    public Text putBackText;
    public Transform tutorMenu;
    public Text tutorText;
    public Transform[] tutorButtons;
    public Transform autoBackCheckbox;


    public bool puttingBack = false;
    public UdonBehaviour putBack;


    private int[] searchNums;


    private string[] cards;
    private int[] orderedCardsInDeck;

    void Start()
    {
        searchNums = new int[tutorButtons.Length];
    }
    public override void Interact()
    {
        if (!puttingBack)
        {
            draw(0);
        }
    }
    public void generateDeck(string[] cardList)
    {
        //get which pool we should use
        int usedPools = (int)networkManager.GetProgramVariable("ourPool");
        if(usedPools == -1)
        {
            Debug.Log("Saving the day");
            return;
        }
        if(usedPools < poolHolders.Length)
        {
            magicCards = new Transform[poolHolders[usedPools].childCount];
            usedCard = new bool[magicCards.Length];
            for(int i = 0; i < magicCards.Length; i++)
            {
                Networking.SetOwner(Networking.LocalPlayer, poolHolders[usedPools].GetChild(i).gameObject);
                poolHolders[usedPools].GetChild(i).GetComponent<UdonBehaviour>().SendCustomEvent("startSerialize");
                magicCards[i] = poolHolders[usedPools].GetChild(i);
                usedCard[i] = false;
            }
        }
        //this has to parse the multipule copies of a card to put in ordered cards
        cards = cardList;
        int totalCardCount = 0;
        string intAsString = "";
        for (int i = 0; i < cards.Length; i++)
        {
            intAsString = "";
            for (int j = 0; j < cards[i].Length; j++)
            {
                if (cardList[i][j] == ' ')
                {
                    j = cards[i].Length;
                    int outCardCount = 0;
                    if (Int32.TryParse(intAsString, out outCardCount))
                    {
                        totalCardCount += outCardCount;
                    }
                    intAsString = "";
                }
                else
                {
                    intAsString += cardList[i][j];
                }
            }
        }
        orderedCardsInDeck = new int[totalCardCount];
        int outTotal = 0;
        for (int i = 0; i < cards.Length; i++)
        {
            for (int j = 0; j < cards[i].Length; j++)
            {
                if (cardList[i][j] == ' ')
                {
                    j = cards[i].Length;
                    int outCardCount = 0;
                    if (!Int32.TryParse(intAsString, out outCardCount))
                    {

                    }

                    for (int l = 0; l < outCardCount; l++)
                    {
                        orderedCardsInDeck[l + outTotal] = i;
                    }
                    outTotal += outCardCount;
                    intAsString = "";
                }
                else
                {
                    intAsString += cardList[i][j];
                }
            }
        }

        shuffle();
    }
    public void shuffle()
    {
        //string[] tempCards = new string[orderedCardsInDeck.Length];
        //orderedCardsInDeck.CopyTo(tempCards, 0);
        int n = orderedCardsInDeck.Length;
        while (n > 1)
        {
            n--;
            int k = UnityEngine.Random.Range(0, n + 1);
            int value = orderedCardsInDeck[k];
            orderedCardsInDeck[k] = orderedCardsInDeck[n];
            orderedCardsInDeck[n] = value;
        }
        int farthestGap = -1;
        for (int i = 0; i < orderedCardsInDeck.Length; i++)
        {
            if (orderedCardsInDeck[i] == -1)
            {
                if (farthestGap == -1)
                {
                    farthestGap = i;
                }
            }
            else if (farthestGap != -1)
            {
                orderedCardsInDeck[farthestGap] = orderedCardsInDeck[i];
                orderedCardsInDeck[i] = -1;
                i = farthestGap;
                farthestGap = -1;
            }
        }
    }
    public void draw(int fromDraw)
    {
        Debug.Log(cards[orderedCardsInDeck[fromDraw]] + ", Num1: " + (int)(orderedCardsInDeck[fromDraw] / 15) + ", Num2: " + (int)(orderedCardsInDeck[fromDraw] % 15));
        CreateCardFromDeck(new int[] { (int)(orderedCardsInDeck[fromDraw] / 15), orderedCardsInDeck[fromDraw] % 15 }, orderedCardsInDeck[fromDraw]);

        for (int i = fromDraw; i < orderedCardsInDeck.Length - 1; i++)
        {
            orderedCardsInDeck[i] = orderedCardsInDeck[i + 1];
        }
        orderedCardsInDeck[orderedCardsInDeck.Length - 1] = -1;
        /*for(int i = 0; i < orderedCardsInDeck.Length; i++)
        {
            if(i+1 >= orderedCardsInDeck.Length)
            {
                orderedCardsInDeck[i] = -1;
            }
            else
            {
                orderedCardsInDeck[i] = orderedCardsInDeck[i+1];
            }
        }*/
    }
    public void search()
    {
        if (tutorText.text == "")
        {
            return;
        }
        for (int j = 0; j < tutorButtons.Length; j++)
        {
            tutorButtons[j].gameObject.SetActive(false);
        }
        for (int i = 0; i < orderedCardsInDeck.Length; i++)
        {
            if (orderedCardsInDeck[i] != -1)
            {
                //remove numbers
                int firstNoNumber = 0;
                for (int l = 0; l < cards[orderedCardsInDeck[i]].Length; l++)
                {
                    if (cards[orderedCardsInDeck[i]][l] == ' ')
                    {
                        firstNoNumber = l;
                        l = cards[orderedCardsInDeck[i]].Length;
                    }
                }
                //if it matches
                if (cards[orderedCardsInDeck[i]].Substring(firstNoNumber + 1).ToLower().Contains(tutorText.text.ToLower()))
                {
                    //Debug.Log("Card:" + cards[orderedCardsInDeck[i]].Substring(firstNoNumber));
                    for (int j = 0; j < tutorButtons.Length; j++)
                    {
                        if (!tutorButtons[j].gameObject.activeSelf)
                        {
                            tutorButtons[j].gameObject.SetActive(true);
                            searchNums[j] = i;
                            tutorButtons[j].GetChild(0).GetComponent<Text>().text = cards[orderedCardsInDeck[i]].Substring(firstNoNumber + 1);
                            j = tutorButtons.Length;
                        }
                    }
                }
            }
        }
    }
    public void completeSearch(int cardToDraw)
    {
        draw(searchNums[cardToDraw]);
        tutorMenu.gameObject.SetActive(false);
        baseMenu.gameObject.SetActive(false);
        puttingBack = false;
    }
    //just reference for the diffrent buttons
    public void completeSearch0()
    {
        completeSearch(0);
    }
    public void completeSearch1()
    {
        completeSearch(1);
    }
    public void completeSearch2()
    {
        completeSearch(2);
    }
    public void completeSearch3()
    {
        completeSearch(3);
    }
    public void openSearch()
    {
        puttingBack = true;
        baseMenu.gameObject.SetActive(true);
        tutorMenu.gameObject.SetActive(true);
        tutorText.text = "";
    }
    public void cancelSearch()
    {
        tutorMenu.gameObject.SetActive(false);
        baseMenu.gameObject.SetActive(false);
        puttingBack = false;
    }
    public void autoTopDeck()
    {
        if (autoBackCheckbox.gameObject.activeSelf)
        {
            autoBackCheckbox.gameObject.SetActive(false);
        }
        else
        {
            autoBackCheckbox.gameObject.SetActive(true);
        }
    }
    public void putBackCardTop()
    {
        int cardDist = 0;
        if (!Int32.TryParse(putBackText.text, out cardDist) && putBackText.text!="")
        {
            return;
        }
        Debug.Log(cardDist);
        if (cardDist < orderedCardsInDeck.Length && cardDist >= 0)
        {
            putBackCardAll(cardDist);
        }
    }
    public void putBackCardBottom()
    {
        for (int i = orderedCardsInDeck.Length - 1; i >= 0; i--)
        {
            if (orderedCardsInDeck[i] != -1)
            {
                int cardDist = 0;
                if (!Int32.TryParse(putBackText.text, out cardDist) && putBackText.text!="")
                {
                    return;
                }
                if (cardDist + i < orderedCardsInDeck.Length && cardDist + i >= 0)
                {
                    putBackCardAll(cardDist + i);
                }
                return;
            }
        }
    }
    public void putBackCardAll(int placeBack)
    {
        //change place in back to change whewre the put in is

        for (int i = orderedCardsInDeck.Length - 2; i >= 0; i--)
        {
            if (i >= placeBack)
            {
                orderedCardsInDeck[i + 1] = orderedCardsInDeck[i];
            }
            if (i == placeBack)
            {
                orderedCardsInDeck[i] = (int)putBack.GetProgramVariable("ourDeckSpot");
            }
        }

        putBack.transform.position = new Vector3(0,-20,0);
        putBack.SetProgramVariable<Vector2>("matOffset", new Vector2(-1,-1));
        for(int i = 0; i < magicCards.Length; i++)
        {
            if(magicCards[i] == putBack.transform)
            {
                usedCard[i] = false;
            }
        }
        putBack.SendCustomEvent("startSerialize");
        //Destroy(putBack.transform.GetChild(0).gameObject);
        //Destroy(putBack.transform.gameObject);

        putBack = null;

        putBackMenu.gameObject.SetActive(false);
        baseMenu.gameObject.SetActive(false);

        puttingBack = false;
    }
    public void openPutBackCard()
    {
        if (!autoBackCheckbox.gameObject.activeSelf)
        {
            puttingBack = true;
            baseMenu.gameObject.SetActive(true);
            putBackMenu.gameObject.SetActive(true);
            putBackText.text = "";
        }
        else
        {
            putBackCardAll(0);
        }
    }
    public void cancelPutBack()
    {
        putBackMenu.gameObject.SetActive(false);
        baseMenu.gameObject.SetActive(false);

        putBack.SendCustomEvent("canclePutBack");
        putBack = null;

        puttingBack = false;
    }
    public void CreateCardFromDeck(int[] cardCordinates, int cardType)
    {
        int unused = -1;
        for(int i = 0; i < usedCard.Length; i++)
        {
            if(!usedCard[i])
            {
                unused = i;
                i = usedCard.Length;
            }
        }
        UdonBehaviour newCard = magicCards[unused].GetComponent<UdonBehaviour>();//Instantiate(magicCard).transform.GetChild(0).GetComponent<MeshRenderer>();
        usedCard[unused] = true;

        //Material mat = newCard.transform.GetChild(0).GetComponent<Renderer>().materials[0];

        //mat.SetTextureOffset("_MainTex", new Vector2(0.06666667f * cardCordinates[0], 0.93333338f - (0.06666667f * cardCordinates[1])));

        //render.materials = new Material[1] { mat };

        newCard.SetProgramVariable<Vector2>("matOffset", new Vector2(0.06666667f * cardCordinates[0], 0.93333338f - (0.06666667f * cardCordinates[1])));
        newCard.SetProgramVariable<UdonBehaviour>("ourDeck", this.transform.GetComponent<UdonBehaviour>());
        newCard.SetProgramVariable<int>("ourDeckSpot", cardType);

        newCard.SendCustomEvent("afterSync");
        newCard.SendCustomEvent("canclePutBack");
        newCard.SendCustomEvent("startSerialize");
    }
}