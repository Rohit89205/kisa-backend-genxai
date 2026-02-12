import { Injectable, HttpException } from "@nestjs/common";
import axios from "axios";
import { SoilMlInputDto } from "./dto/soil-ml-input.dto";

@Injectable()
export class SoilMlService {
  private readonly ML_API = process.env.ML_API_URL || "http://localhost:8000";

  async predictSoil(data: SoilMlInputDto) {
    try {
      const res = await axios.post(
        `${this.ML_API}/predict/soil`,
        data
      );
      return res.data;
    } catch (err) {
      throw new HttpException(
        "ML prediction failed",
        502
      );
    }
  }
}
