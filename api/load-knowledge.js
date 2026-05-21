export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success:false,
      error:"POST only"
    });
  }

  try {

    const stage = req.body?.stage;

    const files = {

      property_extraction:"01_PROPERTY_DATA_EXTRACTION.txt",

      business_card_extraction:"02_BUSINESS_CARD_EXTRACTION.txt",

      fb_card_rules:"03_FB_CARD_CONTENT_RULES.txt",

      style_selection:"04_IMAGE_STYLE_LIBRARY.txt",

      image_prompt:"05_IMAGE_PROMPT_TEMPLATE.txt",

      generation_failsafe:"06_IMAGE_GENERATION_FAILSAFE.txt"

    };

    const fileName = files[stage];

    if (!fileName){

      return res.status(400).json({
        success:false,
        error:"invalid stage"
      });

    }

    const url=
`https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main/fb_card/${fileName}`;

    const response=await fetch(url);

    if(!response.ok){

      return res.status(500).json({
        success:false,
        error:"github load failed",
        file:fileName
      });

    }

    const text=await response.text();

    return res.status(200).json({

      success:true,

      module:"fb_card",

      stage,

      fileName,

      content:text.substring(0,10000)

    });

  }

  catch(error){

    return res.status(500).json({

      success:false,

      error:error.message

    });

  }

}
