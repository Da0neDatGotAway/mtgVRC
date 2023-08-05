
using UdonSharp;
using UnityEngine;
using VRC.SDKBase;
using VRC.Udon;

public class MagicCard : UdonSharpBehaviour
{
    public MeshRenderer cardRend;
    public Material[] backFace;
    public VRC_Pickup pickup;
    [UdonSynced]
    public Vector3 ourPos;
    [UdonSynced]
    public Quaternion ourRot;
    [UdonSynced]
    public Vector2 matOffset = new Vector2(-1,-1);
    private Vector2 lastMatOffset = new Vector2(-1,-1);
    public Material[] cardMat;
    public UdonBehaviour ourDeck =null;
    public int ourDeckSpot;
    private bool face = true;
    private bool onDeck = false;
    private bool shouldBeEnabled = false;
    public Rigidbody rb;
    private float _t = 0;

    public override void OnDeserialization()
    {
        afterSync();
    }
    void Update()
    {
        if(shouldBeEnabled){
            if(Vector3.Angle((Networking.LocalPlayer.GetTrackingData(VRCPlayerApi.TrackingDataType.Head).position) - this.transform.position, transform.up) < 90)
            {
                if(!face)
                {
                    face=true;
                    cardRend.materials = cardMat;
                    cardRend.transform.rotation = this.transform.rotation;
                }
            }
            else if(face)
            {
                if(face)
                {
                    face=false;
                    cardRend.materials = backFace;
                    cardRend.transform.rotation = this.transform.rotation;
                    cardRend.transform.RotateAround(this.transform.position, this.transform.forward, 180);
                }
            }
            if(!Networking.IsOwner(Networking.LocalPlayer, this.gameObject))
            {
                transform.position = ourPos;
                transform.rotation = ourRot;
            }
            else if(rb.velocity.magnitude > 0.1f)
            {
                float dur = 1f / 20;
                _t += Time.deltaTime;
                if(_t > dur)
                {
                    _t -= dur;
                    ourPos = transform.position;
                    ourRot = transform.rotation;
                    startSerialize();
                }
            }
        }
    }

    void OnTriggerEnter(Collider other)
    {
        if(ourDeck!=null)
        {
            if(other.transform == ourDeck.transform)
            {
                onDeck = true;
            }
        }
    }
    void OnTriggerExit(Collider other)
    {
        if(ourDeck!=null)
        {
            if(other.transform == ourDeck.transform)
            {
                onDeck = false;
            }
        }
    }


    public override void OnDrop()
    {
        if(onDeck && !(bool)ourDeck.GetProgramVariable("puttingBack"))
        {
            this.GetComponent<Rigidbody>().isKinematic = true;
            pickup.pickupable = false;
            cardRend.transform.gameObject.SetActive(false);
            this.transform.position = new Vector3(0,-10,0);
            ourDeck.SetProgramVariable<UdonBehaviour>("putBack", this.GetComponent<UdonBehaviour>());
            {
                ourDeck.SendCustomEvent("openPutBackCard");
            }
        }
    }

    public override void OnPickup()
    {
        this.GetComponent<Rigidbody>().useGravity = true;
    }

    public void canclePutBack()
    {
        cardRend.transform.gameObject.SetActive(true);
        this.GetComponent<Rigidbody>().isKinematic = false;
        this.GetComponent<Rigidbody>().useGravity = false;
        pickup.pickupable = true;
        this.transform.position = Networking.LocalPlayer.GetTrackingData(VRCPlayerApi.TrackingDataType.RightHand).position;
        
    }

    public void afterSync()
    {
        if(matOffset != lastMatOffset)
        {
            lastMatOffset = matOffset;
            if(matOffset != new Vector2(-1,-1))
            {
                Material newMat = cardRend.materials[0];

                newMat.SetTextureOffset("_MainTex", matOffset);

                cardMat = new Material[1]{ newMat };

                cardRend.materials = cardMat;

                this.GetComponent<BoxCollider>().isTrigger = false;
                this.GetComponent<Rigidbody>().isKinematic = false;
                pickup.pickupable = true;
                cardRend.gameObject.SetActive(true);
                shouldBeEnabled = true;
            }
            else
            {
                this.GetComponent<BoxCollider>().isTrigger = true;
                this.GetComponent<Rigidbody>().isKinematic = true;
                pickup.pickupable = false;
                cardRend.gameObject.SetActive(false);
                shouldBeEnabled = false;
            }
        }
    }

    public void startSerialize()
    {
        RequestSerialization();
    }
}
